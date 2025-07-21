import { createClient } from '@/lib/supabase-server';
import Dashboard from './Dashboard';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createClient(); // <-- Await it here too

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    { data: bookmarksData },
    { data: foldersData }
  ] = await Promise.all([
    supabase.from('bookmarks').select('*').order('created_at', { ascending: false }),
    supabase.from('folders').select('*').order('name', { ascending: true })
  ]);

  return (
    <Dashboard 
      user={user}
      initialBookmarks={bookmarksData || []}
      initialFolders={foldersData || []}
    />
  );
}
