import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Atom, BookOpen, Bookmark, Check, ChevronDown, FileImage, FileText, FolderOpen, ListTree, MenuGlyph, Plus, Search, SlidersHorizontal, Upload, X } from './Icons'
import Artwork, { Spark } from './Artwork'
import NavigationDrawer from './NavigationDrawer'
import SettingsPage from './SettingsPage'
import PlanPage from './PlanPage'
import LessonPlayer from './LessonPlayer'
import { lessons, formatTime, artworkForTitle } from './data'
import type { Lesson, Subject } from './data'
import { listVideos, requestVideo, videoLesson } from './videos'

function readLocal<T,>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback }
}

function IconButton({ children, label, onClick, className = '' }: { children: ReactNode, label: string, onClick: () => void, className?: string }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

function Modal({ children, onClose, label, className = '' }: { children: ReactNode, onClose: () => void, label: string, className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, [tabindex="0"]') || [])
    focusable()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const list = focusable(), first = list[0], last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); previouslyFocused?.focus() }
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label} ref={ref}>{children}</div></div>
}

function VideoThumbnail({ lesson, onOpen, continueWatching = false }: { lesson: Lesson, onOpen: () => void, continueWatching?: boolean }) {
  const progress = Math.max(0, Math.min(lesson.progress ?? 0, 1))
  const barFill = progress === 0 ? 1 : progress
  return <button className={`${continueWatching ? 'continue-widget ' : ''}video-thumbnail ${lesson.color}`} aria-label={`${continueWatching ? 'Continue watching' : 'Play'} ${lesson.title}`} onClick={onOpen}>
      {continueWatching && <span className="widget-top"><span className="label">Continue watching</span><ArrowUpRight size={17}/></span>}
      <span className="thumbnail-art"><Artwork kind={lesson.artwork}/></span>
      <span className="thumbnail-bottom">
        <h4 className="thumbnail-title">{lesson.title}</h4>
        <span className="thumbnail-playback" aria-hidden="true"><span className="thumbnail-progress"><span style={{ width: `${barFill * 100}%` }}/></span><span className="thumbnail-time">{formatTime(lesson.duration)}</span></span>
      </span>
    </button>
}

function VideoCard({ lesson, saved, onOpen, onToggleSaved, index = 0 }: { lesson: Lesson, saved: boolean, onOpen: () => void, onToggleSaved: () => void, index?: number }) {
  return <article className="video-card" style={{ animationDelay: `${index * 45}ms` }}>
    <VideoThumbnail lesson={lesson} onOpen={onOpen}/>
    <button className={`bookmark-button ${saved ? 'saved' : ''}`} onClick={onToggleSaved} aria-label={`${saved ? 'Unsave' : 'Save'} ${lesson.title}`} aria-pressed={saved}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'}/></button>
  </article>
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readLocal('aha-theme', 'light'))
  const [path, setPath] = useState(window.location.pathname)
  const [menu, setMenu] = useState(false)
  const [studio, setStudio] = useState<'files' | 'text' | null>(null)
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])
  const [tab, setTab] = useState<'workspace' | 'library'>('workspace')
  const [filter, setFilter] = useState('All subjects')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [savedOnly, setSavedOnly] = useState(false)
  const [bookmarks, setBookmarks] = useState<string[]>(() => readLocal('aha-bookmarks', []))
  const [customLessons, setCustomLessons] = useState<Lesson[]>(() => readLocal('aha-lessons', []))
  const [toast, setToast] = useState('')
  const allLessons = useMemo(() => [...customLessons.map(lesson => ({ ...lesson, artwork: artworkForTitle(lesson.title, lesson.artwork) })), ...lessons], [customLessons])
  useEffect(() => {
    let active = true
    void listVideos().then(videos => {
      if (active) setCustomLessons(old => [...videos.map(videoLesson), ...old.filter(lesson => !lesson.videoId)])
    }).catch(() => { if (active) setToast('Could not refresh your saved videos.') })
    return () => { active = false }
  }, [])
  const continuingLesson = lessons[1]
  const selected = path.startsWith('/watch/') ? allLessons.find(l => l.id === decodeURIComponent(path.split('/')[2] || '')) : undefined
  const invalidLesson = path.startsWith('/watch/') && !selected
  const settings = path === '/settings'
  const planning = path === '/plan'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('aha-theme', JSON.stringify(theme))
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f4f8' : '#000000')
  }, [theme])
  useEffect(() => { const listener = () => { setPath(window.location.pathname); setMenu(false) }; window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener) }, [])
  useEffect(() => { localStorage.setItem('aha-bookmarks', JSON.stringify(bookmarks)) }, [bookmarks])
  useEffect(() => { localStorage.setItem('aha-lessons', JSON.stringify(customLessons)) }, [customLessons])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { document.title = selected ? `${selected.title} — Aha!` : settings ? 'Settings — Aha!' : planning ? 'Plan — Aha!' : 'Aha! — Make it click.' }, [selected, settings, planning])

  const navigate = (url: string) => { window.history.pushState({}, '', url); setPath(url); setMenu(false); window.scrollTo({ top: 0, behavior: 'instant' }) }
  const openLesson = (lesson: Lesson) => navigate(`/watch/${encodeURIComponent(lesson.id)}`)
  const toggleSaved = (id: string) => setBookmarks(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id])
  const goLibrary = () => { if (path !== '/') navigate('/'); setTab('library'); setMenu(false); setTimeout(() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) }

  const goWorkspace = () => { navigate('/'); setTab('workspace') }
  const menuContent = <NavigationDrawer
    open={menu}
    current={settings ? 'settings' : planning ? 'plan' : selected ? 'lesson' : tab}
    onClose={() => setMenu(false)}
    onWorkspace={goWorkspace}
    onLibrary={goLibrary}
    onPlan={() => navigate('/plan')}
    onCreate={() => { setMenu(false); setStudio('files') }}
    onSettings={() => navigate('/settings')}
  />

  const visible = allLessons.filter(l => (filter === 'All subjects' || l.subject === filter) && (!savedOnly || bookmarks.includes(l.id)) && `${l.title} ${l.subject}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title) : sort === 'duration' ? a.duration - b.duration : 0)
  const subjects = (['Organic chemistry', 'Linear algebra', 'My ideas'] as Subject[]).filter(subject => visible.some(l => l.subject === subject))

  return <>
    {selected ? <LessonPlayer key={selected.id} lesson={selected} theme={theme} menuOpen={menu} onMenu={() => setMenu(!menu)} menuContent={menuContent} onHome={goLibrary} overlayOpen={!!studio}/>
    : <div className="app-shell">
      <header className="header">
        <div className="header-start"><div className="menu-anchor"><button className={`icon-button menu-toggle ${menu ? 'is-open' : ''}`} aria-label="Open navigation and settings" aria-expanded={menu} aria-controls="navigation-drawer" onClick={() => setMenu(!menu)}><MenuGlyph/></button>{menuContent}</div><button className="wordmark" onClick={() => { navigate('/'); setTab('workspace') }}>Aha!</button></div>
        <nav className="top-nav" aria-label="Main navigation"><button className={!settings && !planning && tab === 'workspace' ? 'active' : ''} onClick={goWorkspace}><FolderOpen size={16}/> Workspace</button><button className={!settings && !planning && tab === 'library' ? 'active' : ''} onClick={goLibrary}><BookOpen size={16}/> Library</button><button className={planning ? 'active' : ''} onClick={() => navigate('/plan')}><ListTree size={16}/> Plan</button></nav>
      </header>
      {settings ? <SettingsPage theme={theme} onTheme={setTheme}/> : planning ? <PlanPage/> : <main>
        <section className="welcome"><h1>Workspace</h1></section>

        {invalidLesson && <div className="not-found"><p>This explanation isn’t in your library yet.</p><button onClick={() => navigate('/')}>Back to your workspace <ArrowRight size={16}/></button></div>}

        <section className="bento" aria-label="Create and explore">
          <div className="upload-widget butter" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setDroppedFiles(Array.from(e.dataTransfer.files)); setStudio('files') }}>
            <div className="widget-top"><span className="label">New video</span><Plus size={18}/></div>
            <div className="upload-body"><div className="simple-upload-icon"><Upload size={27}/></div><h2>Drop your material here</h2></div>
            <div className="upload-bottom"><button className="primary-button" onClick={() => setStudio('files')}>Choose files <Plus size={15}/></button><button className="simple-text-button" onClick={() => setStudio('text')}>Use text <ArrowRight size={14}/></button></div>
          </div>
          <VideoThumbnail lesson={continuingLesson} onOpen={() => openLesson(continuingLesson)} continueWatching/>
          <div className="side-widgets"><button className="idea-widget sage" onClick={() => setStudio('text')}><div className="widget-top"><span className="label">Start with text</span><ArrowUpRight size={17}/></div><FileText className="idea-icon" size={30}/><h3>A question.<br/> An idea.</h3><span className="text-link">Add text <Plus size={15}/></span></button></div>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <h2>Library</h2>
            <div className="library-actions">
              <button className={`saved-button ${savedOnly ? 'active' : ''}`} onClick={() => setSavedOnly(!savedOnly)} aria-label="Saved videos" aria-pressed={savedOnly}><Bookmark size={16} fill={savedOnly ? 'currentColor' : 'none'}/><span>Saved</span></button>
              <label className="sort-select"><SlidersHorizontal size={16}/><select aria-label="Sort videos" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently added</option><option value="az">Title A–Z</option><option value="duration">Shortest first</option></select><ChevronDown size={13}/></label>
            </div>
          </div>
          <div className="library-toolbar">
            <div className="filter-tabs" role="group" aria-label="Filter by subject">{['All subjects', 'Organic chemistry', 'Linear algebra', ...(customLessons.some(l => l.subject === 'My ideas') ? ['My ideas'] : [])].map(subject => <button key={subject} className={filter === subject ? 'active' : ''} aria-pressed={filter === subject} onClick={() => setFilter(subject)}>{subject}</button>)}</div>
            <label className="search-box"><Search size={17}/><input placeholder="Search videos" aria-label="Search your library" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14}/></button>}</label>
          </div>
          {subjects.map(subject => <div className="subject-group" key={subject}>
            <div className="subject-heading"><span className="subject-symbol">{subject === 'Organic chemistry' ? <Atom size={20}/> : subject === 'Linear algebra' ? <ArrowUpRight size={19}/> : <FileText size={18}/>}</span><h3>{subject}</h3></div>
            <div className="video-grid">{visible.filter(l => l.subject === subject).map((lesson, index) => <VideoCard key={lesson.id} lesson={lesson} saved={bookmarks.includes(lesson.id)} onOpen={() => openLesson(lesson)} onToggleSaved={() => toggleSaved(lesson.id)} index={index}/>)}</div>
          </div>)}
          {!visible.length && <div className="empty-library"><h3>{savedOnly ? 'No saved videos' : 'No videos found'}</h3><button className="secondary-button" onClick={() => { setQuery(''); setFilter('All subjects'); setSavedOnly(false) }}>Clear filters</button></div>}
        </section>
      </main>}
      <footer><span className="footer-logo">Aha!</span></footer>
    </div>}
    {studio && <Studio initialTab={studio} initialFiles={droppedFiles} onClose={() => { setStudio(null); setDroppedFiles([]) }} onCreate={lesson => { setCustomLessons(old => [lesson, ...old]); setStudio(null); setDroppedFiles([]); setFilter('All subjects'); setSavedOnly(false); setQuery(''); navigate(`/watch/${lesson.id}`); setTab('library'); setToast('Your video is being prepared.'); setTimeout(() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' }), 120) }}/>}
    {toast && <div className="toast" role="status"><span><Check size={16}/></span>{toast}</div>}
  </>
}

function Studio({ initialTab, initialFiles, onClose, onCreate }: { initialTab: 'files' | 'text', initialFiles: File[], onClose: () => void, onCreate: (lesson: Lesson) => void }) {
  const [tab, setTab] = useState(initialTab)
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [dragging, setDragging] = useState(false)
  const [stage, setStage] = useState(-1)
  const [error, setError] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const stableClose = useRef(() => onCloseRef.current()).current
  const [preview, setPreview] = useState('')
  const ready = !!files.length || !!text.trim()
  const addFiles = (newFiles: File[]) => {
    const valid = newFiles.filter(f => f.size <= 50 * 1024 * 1024)
    setError(valid.length !== newFiles.length ? 'Please choose files smaller than 50 MB each.' : '')
    setFiles(old => [...old, ...valid.filter(f => !old.some(o => o.name === f.name && o.size === f.size))].slice(0, 10))
    if (!title && valid[0]) setTitle(valid[0].name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '))
  }
  useEffect(() => {
    const first = files.find(f => f.type.startsWith('image/'))
    if (!first) { setPreview(''); return }
    const url = URL.createObjectURL(first); setPreview(url); return () => URL.revokeObjectURL(url)
  }, [files])
  useEffect(() => { if (initialFiles.length) addFiles(initialFiles) }, [])
  const requestKey = useRef(crypto.randomUUID())
  const requestBody = useRef('')
  const create = async () => {
    setStage(0); setError('')
    try {
      const documents = []
      const { readPlanDocument } = await import('./documentReader')
      for (const file of files) {
        const document = await readPlanDocument(file, () => {})
        documents.push({ name: document.name, text: document.lines.map(line => line.text).join('\n') })
      }
      const body = { title: title.trim() || text.trim().split('\n')[0].slice(0, 70) || 'My next aha! moment', topic: text, documents }
      const serialized = JSON.stringify(body)
      if (serialized !== requestBody.current) { requestBody.current = serialized; requestKey.current = crypto.randomUUID() }
      setStage(1)
      onCreate(videoLesson(await requestVideo(body, requestKey.current)))
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); setStage(-1) }
  }
  const dropped = (e: DragEvent) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)) }
  const fileChanged = (e: ChangeEvent<HTMLInputElement>) => { addFiles(Array.from(e.target.files || [])); e.target.value = '' }
  return <Modal onClose={stableClose} label="Create a new explanation" className="studio-modal"><div className="studio-header"><div className="studio-symbol butter"><Spark/></div><IconButton label="Close studio" onClick={stableClose}><X size={21}/></IconButton></div>
    {stage >= 0 ? <div className="creation-state"><div className="creation-orbit"><Artwork kind="orbitals" animated/></div><div className="eyebrow">A LITTLE PREVIEW OF WHAT’S TO COME</div><h2>Making room<br/>for understanding.</h2><div className="creation-steps">{['Gathering your ideas', 'Finding the bigger picture', 'Setting the scene'].map((label, i) => <div className={i <= stage ? 'done' : ''} key={label}><span>{i < stage ? <Check size={13}/> : i + 1}</span>{label}</div>)}</div><p className="demo-disclaimer">Preparing an interactive sample.<br/>Generation continues after you leave.</p></div>
    : <><div className="studio-intro"><h2>New video</h2></div><div className="studio-tabs"><button className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}><Upload size={16}/> Files</button><button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}><FileText size={16}/> Text</button></div>
      <input ref={picker} type="file" multiple onChange={fileChanged} hidden aria-label="Choose source files"/>
      {tab === 'files' ? <><div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={dropped}><button className="dropzone-target" onClick={() => picker.current?.click()}>{preview ? <img className="upload-preview" src={preview} alt="Your uploaded source"/> : <span className="upload-icon"><Upload size={25}/></span>}<strong>{files.length ? 'Add another file' : 'Drop files here'}</strong><span className="choose-file">{files.length ? 'Choose files' : 'Browse files'} <Plus size={14}/></span></button></div>{files.length > 0 && <div className="file-list">{files.map((file, i) => <div key={`${file.name}-${i}`}><span className="file-icon">{file.type.startsWith('image/') ? <FileImage size={19}/> : <FileText size={19}/>}</span><div><strong>{file.name}</strong><small>{file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</small></div><button aria-label={`Remove ${file.name}`} onClick={() => setFiles(old => old.filter((_, index) => index !== i))}><X size={15}/></button></div>)}</div>}</>
      : <div className="thought-input"><textarea id="thought" aria-label="Your idea" value={text} onChange={e => setText(e.target.value)} placeholder="Write a question or idea…" maxLength={10000}/><div><span>{text.length.toLocaleString()} / 10,000</span></div></div>}
      {error && <p className="file-error" role="alert">{error}</p>}
      {tab === 'files' && text.trim() && <button className="attached-thought" onClick={() => setTab('text')}><FileText size={15}/> Your written thought is included <Check size={14}/></button>}
      {tab === 'text' && files.length > 0 && <button className="attached-thought" onClick={() => setTab('files')}><FileText size={15}/> {files.length} source {files.length === 1 ? 'file' : 'files'} included <Check size={14}/></button>}
      <div className="studio-footer"><div><span className="privacy-dot"/> Source text is sent to the server · sample generation</div><button className="primary-button" disabled={!ready} onClick={() => { void create() }}>Create a preview <ArrowRight size={17}/></button></div>
    </>}
  </Modal>
}
