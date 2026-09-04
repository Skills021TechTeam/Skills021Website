import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://omyshvrienmporfzbrwx.supabase.co'
const supabaseKey = 'sb_publishable_TeCEG_tRMthfM1eL7IbhtQ_W6AYxEmu'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('live_webinars')
    .select('*')
    
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Webinars:', data)
  }
}
run()
