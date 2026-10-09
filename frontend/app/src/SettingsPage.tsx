import { ArrowUpRight, Check, Heart, Moon, Sun } from 'lucide-react'

type SettingsPageProps = {
  theme: 'light' | 'dark'
  onTheme: (theme: 'light' | 'dark') => void
  onAbout: () => void
}

export default function SettingsPage({ theme, onTheme, onAbout }: SettingsPageProps) {
  return <main className="settings-page">
    <div className="welcome"><h1>Settings</h1></div>
    <section className="settings-panel" aria-labelledby="appearance-heading">
      <div className="panel-heading"><div><h2 id="appearance-heading">Appearance</h2><p>Make yourself at home.</p></div><span className="section-icon butter"><Sun size={25}/></span></div>
      <div className="appearance-options" role="group" aria-label="Color theme">
        <button className={`appearance-card ${theme === 'light' ? 'butter selected' : ''}`} aria-pressed={theme === 'light'} onClick={() => onTheme('light')}><Sun size={28} strokeWidth={1.7}/><span className="selection-check">{theme === 'light' && <Check size={19}/>}</span><span>Light</span></button>
        <button className={`appearance-card ${theme === 'dark' ? 'lavender selected' : ''}`} aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={28} strokeWidth={1.7}/><span className="selection-check">{theme === 'dark' && <Check size={19}/>}</span><span>Dark</span></button>
      </div>
    </section>
    <section className="settings-panel" aria-labelledby="about-heading">
      <div className="panel-heading"><h2 id="about-heading">A little about us</h2><span className="section-icon sage"><Heart size={25}/></span></div>
      <button className="about-settings-card peach" onClick={onAbout}><Heart size={25} strokeWidth={1.7}/><span>About this little project</span><ArrowUpRight size={22}/></button>
    </section>
  </main>
}
