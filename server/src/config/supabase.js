import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv"
dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL ;
console.log(`supabase service key : ${process.env.SUPABASE_SERVICE_KEY}`)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;
