// Counts one visitor per browser per day for the admin dashboard
// (public.count_visit). No personal data is stored — just a daily number.
(function(){
  try {
    const key = 'buyrblx_visit_' + new Date().toISOString().slice(0, 10);
    if(localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    supabaseClient.rpc('count_visit').then(() => {}, () => {});
  } catch(e){ /* storage blocked — skip counting */ }
})();
