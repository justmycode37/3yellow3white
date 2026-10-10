import { Check, Moon, Sun } from './Icons'

type SettingsPageProps = {
  theme: 'light' | 'dark'
  onTheme: (theme: 'light' | 'dark') => void
}

export default function SettingsPage({ theme, onTheme }: SettingsPageProps) {
  return <main className="settings-page">
    <div className="welcome"><h1>Settings</h1></div>
    <section className="settings-panel" aria-labelledby="appearance-heading">
      <div className="panel-heading"><div><h2 id="appearance-heading">Appearance</h2><p>Make yourself at home.</p></div><span className={`section-icon theme-symbol ${theme === 'dark' ? 'lavender is-dark' : 'butter'}`} aria-hidden="true"><Sun className="theme-sun" size={25}/><Moon className="theme-moon" size={25}/></span></div>
      <div className="appearance-options" role="group" aria-label="Color theme">
        <button className={`appearance-card ${theme === 'light' ? 'butter selected' : ''}`} aria-pressed={theme === 'light'} onClick={() => onTheme('light')}><Sun size={28}/><span className="selection-check"><Check size={19}/></span><span>Light</span></button>
        <button className={`appearance-card ${theme === 'dark' ? 'lavender selected' : ''}`} aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={28}/><span className="selection-check"><Check size={19}/></span><span>Dark</span></button>
      </div>
    </section>
  </main>
}
