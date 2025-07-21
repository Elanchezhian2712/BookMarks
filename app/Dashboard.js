'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase-client';


// --- Reusable Framer Motion Variants ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };


// --- Command Bar Component (For Adding/Editing Bookmarks) ---
function CommandBar({ isOpen, onClose, onFormSubmit, editingBookmark }) {
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => {
    if (editingBookmark) {
      setTitle(editingBookmark.title);
      setDesc(editingBookmark.description || '');
      setLink(editingBookmark.link || '');
    } else {
      setTitle(''); setDesc(''); setLink('');
    }
  }, [editingBookmark, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onFormSubmit({ title, description, link });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div className="command-bar-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="command-bar" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()}>
          <h4 className="p-4 pb-0 fw-bold">{editingBookmark ? 'Edit Bookmark' : 'Add New Bookmark'}</h4>
          <form id="bookmark-form" onSubmit={handleSubmit} className="command-bar__form">
            <input type="text" className="form-control mb-2" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
            <input type="text" className="form-control mb-2" placeholder="Description (optional)" value={description} onChange={e => setDesc(e.target.value)} />
            <input type="url" className="form-control" placeholder="URL (optional)" value={link} onChange={e => setLink(e.target.value)} />
          </form>
          <div className="command-bar__footer">
            <button type="submit" form="bookmark-form" className="btn btn-primary px-3 py-2">{editingBookmark ? 'Save Changes' : 'Add Bookmark'}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


// --- Main Dashboard Component ---
export default function Dashboard({ user, initialBookmarks, initialFolders }) {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [folders, setFolders] = useState(initialFolders);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [theme, setTheme] = useState('dark');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);

  // *** NEW STATE FOR UNIVERSAL SEARCH ***
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const savedTheme = localStorage.getItem('aurora-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('aurora-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setEditingBookmark(null);
        setIsCommandOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const refreshData = async () => {
    const [bookmarksRes, foldersRes] = await Promise.all([
      supabase.from('bookmarks').select('*').order('created_at', { ascending: false }),
      supabase.from('folders').select('*').order('name', { ascending: true })
    ]);
    setBookmarks(bookmarksRes.data || []);
    setFolders(foldersRes.data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleAddFolder = async () => {
    const folderName = prompt("Enter new folder name:");
    if (folderName && folderName.trim() !== '') {
      const { data } = await supabase.from('folders').insert({ name: folderName, user_id: user.id }).select().single();
      await refreshData();
      if (data) setSelectedFolder(data.id);
    }
  };

  const handleDeleteBookmark = async (id) => {
    if (window.confirm("Are you sure you want to delete this bookmark?")) {
      await supabase.from('bookmarks').delete().eq('id', id);
      await refreshData();
    }
  };

  const handleOpenEdit = (bookmark) => {
    setEditingBookmark(bookmark);
    setIsCommandOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingBookmark) {
      await supabase.from('bookmarks').update(formData).eq('id', editingBookmark.id);
    } else {
      await supabase.from('bookmarks').insert({
        ...formData,
        folder_id: selectedFolder !== 'all' ? selectedFolder : null,
        user_id: user.id
      });
    }
    await refreshData();
  };

  // --- Main Filtering and Sorting Logic ---
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let intermediateBookmarks = [];

    // 1. Filter by search query first (if any)
    if (query) {
      intermediateBookmarks = bookmarks.filter(bm =>
        bm.title.toLowerCase().includes(query) ||
        (bm.description && bm.description.toLowerCase().includes(query))
      );
    } else {
      intermediateBookmarks = bookmarks;
    }

    // 2. Filter by selected folder
    let finalBookmarks = intermediateBookmarks.filter(bm =>
      selectedFolder === 'all' || bm.folder_id == selectedFolder
    );

    // *** 3. SORT THE RESULTS ***
    finalBookmarks.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Determine visible folders based on search
    let visibleFolders = folders;
    if (query) {
      const matchingFolderIds = new Set(finalBookmarks.map(bm => bm.folder_id));
      visibleFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(query) || matchingFolderIds.has(folder.id)
      );
    }

    return { visibleFolders, visibleBookmarks: finalBookmarks };

  }, [searchQuery, bookmarks, folders, selectedFolder, sortOrder]); // Add sortOrder to dependency array


  const selectedFolderName = useMemo(() => {
    if (searchQuery) return `Search results for "${searchQuery}"`;
    if (selectedFolder === 'all') return 'All Bookmarks';
    return folders.find(f => f.id == selectedFolder)?.name || '...';
  }, [selectedFolder, folders, searchQuery]);



  return (
    <>
      <CommandBar
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onFormSubmit={handleFormSubmit}
        editingBookmark={editingBookmark}
      />

      <div className="aurora-layout">
        {/* === Sidebar === */}
        <aside className="sidebar">
          <h1 className="sidebar__header fw-bold">My Bookmarks</h1>

          {/* *** NEW SEARCH BAR *** */}
          <input
            type="search"
            placeholder="Search all..."
            className="sidebar__search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // When searching, always show results from 'all' folders
              if (e.target.value) setSelectedFolder('all');
            }}
          />

          <div className="sidebar__section">
            <span>New Folders</span>
            <button onClick={handleAddFolder} className="btn" title="Add Folder"><i className="fas fa-plus"></i></button>
          </div>
          <ul className="folder-list">
            {/* "All Bookmarks" is always visible, but disabled during a search */}
            <motion.li
              layout
              className={`folder-list__item ${selectedFolder === 'all' && !searchQuery ? 'folder-list__item--active' : ''}`}
              onClick={() => {
                setSearchQuery(''); // Clear search when a folder is clicked
                setSelectedFolder('all');
              }}
              style={{ cursor: searchQuery ? 'not-allowed' : 'pointer' }}
            >
              <i className="fas fa-globe-americas fa-fw"></i>All Bookmarks
            </motion.li>

            {/* Render the filtered folders */}
            {filteredData.visibleFolders.map(folder => (
              <motion.li
                layout
                key={folder.id}
                className={`folder-list__item ${selectedFolder === folder.id && !searchQuery ? 'folder-list__item--active' : ''}`}
                onClick={() => {
                  setSearchQuery(''); // Clear search when a folder is clicked
                  setSelectedFolder(folder.id);
                }}
                style={{ cursor: searchQuery ? 'not-allowed' : 'pointer' }}
              >
                <i className="fas fa-folder fa-fw"></i>{folder.name}
              </motion.li>
            ))}
          </ul>
          <div className="sidebar__footer">
            {/* <div className="theme-switcher">
              <button onClick={() => handleThemeChange('light')} className={theme === 'light' ? 'active' : ''} title="Light Theme"><i className="fas fa-sun"></i></button>
              <button onClick={() => handleThemeChange('dark')} className={theme === 'dark' ? 'active' : ''} title="Dark Theme"><i className="fas fa-moon"></i></button>
            </div> */}
            <div className="user-info">
              <span title={user.email}>{user.email}</span>
              <button onClick={handleLogout} className="btn" title="Logout"><i className="fas fa-sign-out-alt"></i></button>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="main-content__header">
            <h2 className="main-content__title">{selectedFolderName}</h2>

            <div className="d-flex align-items-center gap-4 ">
              <span
                className="text-secondary small d-none d-md-block text-center"
                style={{ marginLeft: '20px' }}
              >
                Press <kbd>⌘K</kbd> to add
              </span>



              {/* The new single control group */}
              <div className="control-group">
                {/* Sort Buttons */}
                <button onClick={() => setSortOrder('newest')} className={sortOrder === 'newest' ? 'active' : ''} title="Sort by Most Recent">
                  <i className="fas fa-arrow-down"></i>
                </button>
                <button onClick={() => setSortOrder('oldest')} className={sortOrder === 'oldest' ? 'active' : ''} title="Sort by Oldest First">
                  <i className="fas fa-arrow-up"></i>
                </button>

                {/* Separator */}
                <div className="control-group__separator"></div>

                {/* View Buttons */}
                <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''} title="Grid View"><i className="fas fa-th-large"></i></button>
                <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''} title="List View"><i className="fas fa-list"></i></button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            <motion.div
              key={selectedFolder + viewMode + searchQuery} // Re-animate on search
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={viewMode === 'grid' ? 'grid-container' : 'list-container'}
            >
              {/* Render the filtered bookmarks */}
              {filteredData.visibleBookmarks.map(bookmark => (
                <motion.div layout key={bookmark.id} variants={itemVariants}>
                  {viewMode === 'grid' ? (
                    <div className="aurora-card">
                      <h5 className="fw-bold text-truncate">{bookmark.title}</h5>
                      <p className="aurora-card__description">{bookmark.description || 'No description'}</p>
                      <div className="aurora-card__footer">
                        {bookmark.link ? (
                          <a href={bookmark.link} target="_blank" rel="noopener noreferrer" className="aurora-card__link">
                            <i className="fas fa-link"></i>
                            <span>{bookmark.link}</span>
                          </a>
                        ) : <span></span>}
                        <div className="aurora-actions">
                          <button onClick={() => handleOpenEdit(bookmark)} title="Edit"><i className="fas fa-edit"></i></button>
                          <button onClick={() => handleDeleteBookmark(bookmark.id)} title="Delete"><i className="fas fa-trash"></i></button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aurora-list-item">
                      <div className="aurora-list-item__icon"><i className="far fa-bookmark"></i></div>
                      <div className="aurora-list-item__content">
                        <div className="aurora-list-item__title">{bookmark.title}</div>
                        {bookmark.link && <div className="aurora-list-item__link">{bookmark.link}</div>}
                      </div>
                      <div className="aurora-actions">
                        <button onClick={() => handleOpenEdit(bookmark)} title="Edit"><i className="fas fa-edit"></i></button>
                        <button onClick={() => handleDeleteBookmark(bookmark.id)} title="Delete"><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}