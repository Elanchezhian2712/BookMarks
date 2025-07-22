'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase-client';

// --- Reusable Framer Motion Variants (Unchanged) ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// --- Command Bar Component (Unchanged) ---
function CommandBar({ isOpen, onClose, onFormSubmit, editingBookmark }) {
    const [title, setTitle] = useState('');
    const [description, setDesc] = useState('');
    const [link, setLink] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingBookmark) {
                setTitle(editingBookmark.title);
                setDesc(editingBookmark.description || '');
                setLink(editingBookmark.link || '');
            } else {
                setTitle('');
                setDesc('');
                setLink('');
            }
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
                <motion.div className="command-bar" initial={{ y: -20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} onClick={(e) => e.stopPropagation()}>
                    <form id="bookmark-form" onSubmit={handleSubmit}>
                        <div className="command-bar__form-body">
                            <input type="text" className="command-bar__input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
                            <input type="text" className="command-bar__input" placeholder="Description (optional)" value={description} onChange={e => setDesc(e.target.value)} />
                            <input type="url" className="command-bar__input" placeholder="URL (optional)" value={link} onChange={e => setLink(e.target.value)} />
                        </div>
                        <div className="command-bar__actions">
                            <button type="submit" className="command-bar__submit-btn">{editingBookmark ? 'Save Changes' : 'Add Bookmark'}</button>
                        </div>
                    </form>
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
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // *** THE MISSING STATE IS ADDED HERE ***
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      supabase.from('bookmarks').select('*'),
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

  const handleDeleteFolder = async (folderId, folderName) => {
    if (window.confirm(`ARE YOU SURE?\n\nDeleting the folder "${folderName}" will also permanently delete ALL bookmarks inside it. This action cannot be undone.`)) {
      if (selectedFolder === folderId) {
        setSelectedFolder('all');
      }
      const { error } = await supabase.from('folders').delete().eq('id', folderId);
      if (error) {
        console.error("Error deleting folder:", error);
        alert("Could not delete the folder.");
      } else {
        await refreshData();
      }
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


const handleCopy = (textToCopy, event) => {
  const button = event.currentTarget;
  const originalIcon = button.innerHTML;

  // Try Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      button.innerHTML = `<i class="fas fa-check"></i>`;
      setTimeout(() => {
        button.innerHTML = originalIcon;
      }, 1500);
    }).catch(err => {
      console.error("Clipboard API failed:", err);
      fallbackCopy(textToCopy, button, originalIcon);
    });
  } else {
    // Fallback if Clipboard API is not supported
    fallbackCopy(textToCopy, button, originalIcon);
  }
};

// Fallback for non-HTTPS or unsupported browsers
const fallbackCopy = (text, button, originalIcon) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed"; // avoid scroll jump
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const success = document.execCommand("copy");
    if (success) {
      button.innerHTML = `<i class="fas fa-check"></i>`;
      setTimeout(() => {
        button.innerHTML = originalIcon;
      }, 1500);
    } else {
      alert("Copy command failed");
    }
  } catch (err) {
    console.error("Fallback copy failed:", err);
    alert("Could not copy text to clipboard.");
  }

  document.body.removeChild(textarea);
};


  // Main Filtering and Sorting Logic
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let intermediateBookmarks = query
      ? bookmarks.filter(bm => bm.title.toLowerCase().includes(query) || (bm.description && bm.description.toLowerCase().includes(query)))
      : bookmarks;

    let finalBookmarks = intermediateBookmarks.filter(bm => selectedFolder === 'all' || bm.folder_id == selectedFolder);

    finalBookmarks.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    let visibleFolders = folders;
    if (query) {
      const matchingFolderIds = new Set(intermediateBookmarks.map(bm => bm.folder_id));
      visibleFolders = folders.filter(folder => folder.name.toLowerCase().includes(query) || matchingFolderIds.has(folder.id));
    }

    return { visibleFolders, visibleBookmarks: finalBookmarks };
  }, [searchQuery, bookmarks, folders, selectedFolder, sortOrder]);

  const selectedFolderName = useMemo(() => {
    if (searchQuery) return `Search results for "${searchQuery}"`;
    if (selectedFolder === 'all') return 'All Bookmarks';
    return folders.find(f => f.id == selectedFolder)?.name || '...';
  }, [selectedFolder, folders, searchQuery]);

  return (
    <>
      <CommandBar isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} onFormSubmit={handleFormSubmit} editingBookmark={editingBookmark} />

      <div className="aurora-layout">
        <aside className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`}>
          <h1 className="sidebar__header fw-bold">My Bookmarks</h1>

          <input type="search" placeholder="Search all..." className="sidebar__search-input" value={searchQuery} onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value) setSelectedFolder('all');
          }} />

          <div className="sidebar__section">
            <span>New Folders</span>
            <button onClick={handleAddFolder} className="btn" title="Add Folder"><i className="fas fa-plus"></i></button>
          </div>
          <ul className="folder-list">
            <motion.li layout className={`folder-list__item ${selectedFolder === 'all' && !searchQuery ? 'folder-list__item--active' : ''}`} onClick={() => {
              setSearchQuery('');
              setSelectedFolder('all');
              setIsSidebarOpen(false); // Close sidebar on selection
            }} style={{ cursor: searchQuery ? 'not-allowed' : 'pointer' }}>
              <i className="fas fa-globe-americas fa-fw"></i>All Bookmarks
            </motion.li>

            {filteredData.visibleFolders.map(folder => (
              <motion.li layout key={folder.id} className={`folder-list__item ${selectedFolder === folder.id && !searchQuery ? 'folder-list__item--active' : ''}`} onClick={() => {
                setSearchQuery('');
                setSelectedFolder(folder.id);
                setIsSidebarOpen(false); // This is where the error was
              }} style={{ cursor: searchQuery ? 'not-allowed' : 'pointer' }}>
                <i className="fas fa-folder fa-fw"></i>
                <span>{folder.name}</span>
                <button className="folder-list__delete-btn" title={`Delete "${folder.name}"`} onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id, folder.name);
                }}>
                  <i className="fas fa-trash-alt fa-sm"></i>
                </button>
              </motion.li>
            ))}
          </ul>

          <div className="sidebar__footer">
            <div className="user-info">
              <span title={user.email}>{user.email}</span>
              <button onClick={handleLogout} className="btn" title="Logout"><i className="fas fa-sign-out-alt"></i></button>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="main-content__header">
            <div className="d-flex align-items-center gap-3">
              <h2 className="main-content__title">{selectedFolderName}</h2>
            </div>
            <div className="d-flex flex-column align-items-end">
              <span className="text-secondary small d-none d-md-block mb-2">Press <kbd>⌘K</kbd> to add</span>
              <div className="control-group">
                <button onClick={() => setSortOrder('newest')} className={sortOrder === 'newest' ? 'active' : ''} title="Sort by Most Recent"><i className="fas fa-arrow-down"></i></button>
                <button onClick={() => setSortOrder('oldest')} className={sortOrder === 'oldest' ? 'active' : ''} title="Sort by Oldest First"><i className="fas fa-arrow-up"></i></button>
                <div className="control-group__separator"></div>
                <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''} title="Grid View"><i className="fas fa-th-large"></i></button>
                <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''} title="List View"><i className="fas fa-list"></i></button>
              </div>
            </div>
          </div>

          <hr style={{ marginBottom: '1.5rem', height: '1px', border: 'none', backgroundColor: '#ccc' }} />



          <AnimatePresence>
            <motion.div key={selectedFolder + viewMode + searchQuery + sortOrder} variants={containerVariants} initial="hidden" animate="visible" className={viewMode === 'grid' ? 'grid-container' : 'list-container'}>
              {filteredData.visibleBookmarks.map(bookmark => (
                <motion.div layout key={bookmark.id} variants={itemVariants}>
                  {viewMode === 'grid' ? (
                    <div className="aurora-card">
                      <h5 className="fw-bold text-truncate">{bookmark.title}</h5>
                      {bookmark.description && (
                        <div className="aurora-card__description-wrapper">
                          <p className="aurora-card__description">{bookmark.description}</p>
                          <button 
                            className="aurora-card__copy-btn" 
                            title="Copy description"
                            onClick={(e) => handleCopy(bookmark.description, e)}
                          >
                            <i className="far fa-copy"></i>
                          </button>
                        </div>
                      )}
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