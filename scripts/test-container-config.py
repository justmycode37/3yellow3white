#!/usr/bin/env python3
import importlib.util
import json
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location("config", Path(__file__).with_name("container-config.py"))
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)


class EnvironmentTests(unittest.TestCase):
    def test_systemd_backslash_rules_preserve_exact_values(self):
        cases = [
            (r'abc\$HOME\#def', 'abc$HOME#def'),
            (r'"abc\$HOME\`value\"\\\q"', 'abc$HOME`value"\\\\q'),
            (r"'abc\$HOME'", r'abc\$HOME'),
            ('  two  words  ', 'two  words'),
            ('value\\ ', 'value '),
            ('abc"quotes"', 'abc"quotes"'),
            ('"  quoted spaces  "  ', '  quoted spaces  '),
        ]
        for source, expected in cases:
            with self.subTest(source=source):
                self.assertEqual(config.environment_value(source, 'env:1'), expected)

    def test_multiline_and_unclosed_quotes_fail_without_secret_values(self):
        for value in ['secret\\', '"secret', "'secret", '"secret" trailing']:
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, 'env:1$') as error:
                config.environment_value(value, 'env:1')
            self.assertNotIn('secret', str(error.exception))

    def test_precedence_quotes_and_literal_dollars(self):
        with tempfile.TemporaryDirectory() as root:
            old, new = Path(root) / "old.env", Path(root) / "new.env"
            old.write_text('KEY=old\nSPACE="two words"\nLITERAL=abc$HOME#def\n')
            new.write_text("# ignored\n; ignored\nKEY='new'\nEMPTY=\n")
            self.assertEqual(config.read_environment([old, Path(root) / "absent", new]), {
                "KEY": "new", "SPACE": "two words", "LITERAL": "abc$HOME#def", "EMPTY": ""
            })

    def test_root_owned_environment_is_captured_without_logging(self):
        path = Path('/etc/3yellow3white/environment')
        with patch.object(Path, 'read_text', side_effect=PermissionError), patch.object(config.subprocess, 'check_output', return_value='KEY=literal$secret\n') as read:
            self.assertEqual(config.read_environment([path]), {'KEY': 'literal$secret'})
            read.assert_called_once_with(['sudo', '-n', 'cat', '--', str(path)], text=True)

    def test_env_is_never_executed(self):
        with tempfile.TemporaryDirectory() as root:
            env, marker = Path(root) / "test.env", Path(root) / "marker"
            env.write_text(f'KEY=$(touch {marker})\n')
            self.assertEqual(config.read_environment([env])["KEY"], f'$(touch {marker})')
            self.assertFalse(marker.exists())

    def test_malformed_assignment_reports_location_without_value(self):
        with tempfile.TemporaryDirectory() as root:
            env = Path(root) / "test.env"
            env.write_text('BAD-KEY=secret-value\n')
            with self.assertRaisesRegex(ValueError, r'test.env:1$') as error:
                config.read_environment([env])
            self.assertNotIn('secret-value', str(error.exception))

    def test_rejects_paths_that_could_change_compose_interpolation(self):
        for path in ['relative', '/tmp/$HOME', '/tmp/line\nbreak', '/tmp/"quote"']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                config.host_path(path)
        self.assertEqual(config.host_path('/tmp/aha/videos.sqlite'), Path('/tmp/aha/videos.sqlite'))

    def test_agent_state_is_persistent_and_separate_from_releases(self):
        with tempfile.TemporaryDirectory() as root:
            base = Path(root)
            release = base / 'releases' / 'candidate'
            release.mkdir(parents=True)
            values = {'NARRATION_DATA_DIR': str(base / 'narration')}
            with patch.object(config, 'read_environment', return_value=values), patch.object(config.sys, 'argv', ['config', str(release), str(base), 'a' * 40, 'image']):
                config.main()
                paths = json.loads((release / 'paths.json').read_text())
                self.assertEqual(paths['agents'], str(base / 'agents'))
                self.assertIn(f'AHA_AGENT_DATA_DIR={base}/agents\n', (release / 'compose.env').read_text())
                for path in [base / 'data', base / 'narration' / 'pi', release / 'pi', base / 'releases']:
                    with self.subTest(path=path), self.assertRaises(ValueError):
                        values['AGENT_STATE_DIR'] = str(path)
                        config.main()


if __name__ == '__main__':
    unittest.main()
