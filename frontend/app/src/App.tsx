import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Atom, Bookmark, Check, ChevronDown, FileText, MenuGlyph, Search, SlidersHorizontal, X } from './Icons'
import Artwork from './Artwork'
import LessonPlayer from './LessonPlayer'
import NavigationDrawer from './NavigationDrawer'
import SettingsPage from './SettingsPage'
import PlanPage from './PlanPage'
import WorkspacePage from './WorkspacePage'
import { exampleCurriculum } from './curriculum'
import { appendSubjectMaterials, loadSubjectPlans, subjectPlansKey } from './subjectPlans'
import type { TopicVideoRequest } from './subjectPlans'
import type { StudyPlan } from './plan'
import { lessons, formatTime, artworkForTitle } from './data'
import type { Lesson } from './data'

function readLocal<T,>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback }
}

function VideoThumbnail({ lesson, onOpen }: { lesson: Lesson, onOpen: () => void }) {
  const progress = Math.max(0, Math.min(lesson.progress ?? 0, 1))
  const barFill = progress === 0 ? 1 : progress
  return <button className={`video-thumbnail ${lesson.color}`} aria-label={`Play ${lesson.title}`} onClick={onOpen}>
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
  const [filter, setFilter] = useState('All subjects')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [savedOnly, setSavedOnly] = useState(false)
  const [bookmarks, setBookmarks] = useState<string[]>(() => readLocal('aha-bookmarks', []))
  const [customLessons, setCustomLessons] = useState<Lesson[]>(() => readLocal('aha-lessons', []))
  const [toast, setToast] = useState('')
  const [topicRequest, setTopicRequest] = useState<TopicVideoRequest | null>(null)
  const [subjectPlans, setSubjectPlans] = useState(() => loadSubjectPlans(localStorage, exampleCurriculum))
  const [planStorageNote, setPlanStorageNote] = useState('')
  const allLessons = useMemo(() => [...customLessons.map(lesson => ({ ...lesson, artwork: artworkForTitle(lesson.title, lesson.artwork) })), ...lessons], [customLessons])
  const selected = path.startsWith('/watch/') ? allLessons.find(l => l.id === decodeURIComponent(path.split('/')[2] || '')) : undefined
  const invalidLesson = path.startsWith('/watch/') && !selected
  const settings = path === '/settings'
  const planning = path === '/plan' || path.startsWith('/plan/')
  const libraryPage = path === '/library'

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('aha-theme', JSON.stringify(theme))
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f4f8' : '#000000')
  }, [theme])
  useEffect(() => { const listener = () => { setPath(window.location.pathname); setMenu(false) }; window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener) }, [])
  useEffect(() => { localStorage.setItem('aha-bookmarks', JSON.stringify(bookmarks)) }, [bookmarks])
  useEffect(() => { localStorage.setItem('aha-lessons', JSON.stringify(customLessons)) }, [customLessons])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { document.title = selected ? `${selected.title} — Aha!` : settings ? 'Settings — Aha!' : planning ? 'Plan — Aha!' : libraryPage ? 'Library — Aha!' : 'Aha! — Make it click.' }, [selected, settings, planning, libraryPage])

  const navigate = (url: string, scroll = true) => { window.history.pushState({}, '', url); setPath(url); setMenu(false); if (scroll) window.scrollTo({ top: 0, behavior: 'instant' }) }
  const openLesson = (lesson: Lesson) => navigate(`/watch/${encodeURIComponent(lesson.id)}`)
  const toggleSaved = (id: string) => setBookmarks(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id])
  const goLibrary = () => navigate('/library')

  const addPlanMaterial = (subjectId: string, plans: StudyPlan[]) => {
    const next = appendSubjectMaterials(subjectPlans, subjectId, plans)
    setSubjectPlans(next)
    try { localStorage.setItem(subjectPlansKey, JSON.stringify(next)); setPlanStorageNote('') }
    catch { setPlanStorageNote('Your plan is available for this session, but the browser could not save it. Keep this page open to retain your material.') }
  }
  const makeTopicVideo = (request: TopicVideoRequest) => { setTopicRequest(request); navigate('/') }
  const goWorkspace = () => { setTopicRequest(null); navigate('/') }
  const createLesson = (lesson: Lesson) => {
    setCustomLessons(old => [lesson, ...old])
    setTopicRequest(null)
    setFilter('All subjects')
    setSavedOnly(false)
    setQuery('')
    openLesson(lesson)
    setToast('Sample preview ready. Saved to your library.')
  }
  const menuContent = <NavigationDrawer
    open={menu}
    current={settings ? 'settings' : planning ? 'plan' : selected ? 'lesson' : libraryPage ? 'library' : 'workspace'}
    onClose={() => setMenu(false)}
    onWorkspace={goWorkspace}
    onLibrary={goLibrary}
    onPlan={() => navigate('/plan')}
    onCreate={() => { goWorkspace(); requestAnimationFrame(() => document.getElementById('video-topic')?.focus()) }}
    onSettings={() => navigate('/settings')}
  />

  const visible = allLessons.filter(l => (filter === 'All subjects' || l.subject === filter) && (!savedOnly || bookmarks.includes(l.id)) && `${l.title} ${l.subject}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title) : sort === 'duration' ? a.duration - b.duration : 0)
  const availableSubjects = [...new Set(allLessons.map(lesson => lesson.subject))]
  const subjects = availableSubjects.filter(subject => visible.some(l => l.subject === subject))

  return <>
    {selected ? <LessonPlayer key={selected.id} lesson={selected} theme={theme} overlayOpen={false} menuOpen={menu} onMenu={() => setMenu(!menu)} menuContent={menuContent} onHome={goLibrary}/>
    : <div className={`app-shell ${settings ? 'settings-shell' : !planning && !libraryPage ? 'workspace-shell' : ''}`}>
      <header className="header">
        <div className="header-start"><div className="menu-anchor"><button className={`icon-button menu-toggle ${menu ? 'is-open' : ''}`} aria-label="Open navigation and settings" aria-expanded={menu} aria-controls="navigation-drawer" onClick={() => setMenu(!menu)}><MenuGlyph/></button>{menuContent}</div><button className="wordmark" onClick={goWorkspace}>Aha!</button></div>
        {!settings && !planning && !libraryPage && <button className="workspace-library-link" onClick={goLibrary}>Your library <ArrowUpRight size={15}/></button>}
      </header>
      {settings ? <SettingsPage theme={theme} onTheme={setTheme}/> : planning ? <PlanPage curriculum={exampleCurriculum} selectedId={path.split('/')[2]} onSelect={id => navigate(`/plan/${id}`, false)} plans={subjectPlans} onAddMaterial={addPlanMaterial} onMakeVideo={makeTopicVideo} storageNote={planStorageNote}/> : libraryPage ? <main className="library-page">
        <section className="library-section" id="library">
          <div className="section-heading">
            <h1>Library</h1>
            <div className="library-actions">
              <button className={`saved-button ${savedOnly ? 'active' : ''}`} onClick={() => setSavedOnly(!savedOnly)} aria-label="Saved videos" aria-pressed={savedOnly}><Bookmark size={16} fill={savedOnly ? 'currentColor' : 'none'}/><span>Saved</span></button>
              <label className="sort-select"><SlidersHorizontal size={16}/><select aria-label="Sort videos" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently added</option><option value="az">Title A–Z</option><option value="duration">Shortest first</option></select><ChevronDown size={13}/></label>
            </div>
          </div>
          <div className="library-toolbar">
            <div className="filter-tabs" role="group" aria-label="Filter by subject">{['All subjects', ...availableSubjects].map(subject => <button key={subject} className={filter === subject ? 'active' : ''} aria-pressed={filter === subject} onClick={() => setFilter(subject)}>{subject}</button>)}</div>
            <label className="search-box"><Search size={17}/><input placeholder="Search videos" aria-label="Search your library" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14}/></button>}</label>
          </div>
          {subjects.map(subject => <div className="subject-group" key={subject}>
            <div className="subject-heading"><span className="subject-symbol">{subject === 'Organic chemistry' ? <Atom size={20}/> : subject === 'Linear algebra' ? <ArrowUpRight size={19}/> : <FileText size={18}/>}</span><h3>{subject}</h3></div>
            <div className="video-grid">{visible.filter(l => l.subject === subject).map((lesson, index) => <VideoCard key={lesson.id} lesson={lesson} saved={bookmarks.includes(lesson.id)} onOpen={() => openLesson(lesson)} onToggleSaved={() => toggleSaved(lesson.id)} index={index}/>)}</div>
          </div>)}
          {!visible.length && <div className="empty-library"><h3>{savedOnly ? 'No saved videos' : 'No videos found'}</h3><button className="secondary-button" onClick={() => { setQuery(''); setFilter('All subjects'); setSavedOnly(false) }}>Clear filters</button></div>}
        </section>
      </main> : <>
        {invalidLesson && <div className="not-found"><p>This explanation isn’t in your library yet.</p><button onClick={goLibrary}>Open your library <ArrowRight size={16}/></button></div>}
        <WorkspacePage key={topicRequest ? `${topicRequest.sourceName}:${topicRequest.chapter}:${topicRequest.title}` : 'workspace'} initialTopic={topicRequest} onCreate={createLesson}/>
      </>}
      {!planning && <footer><span className="footer-logo">Aha!</span></footer>}
    </div>}
    {toast && <div className="toast" role="status"><span><Check size={16}/></span>{toast}</div>}
  </>
}
