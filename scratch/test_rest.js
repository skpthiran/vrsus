
const url = 'https://azufpxcpbkcrqapfislu.supabase.co/rest/v1/duels?select=*&limit=1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dWZweGNwYmtjcnFhcGZpc2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTczMjUsImV4cCI6MjA5MjQ3MzMyNX0.VY0KpiuayrbXcYhVmahRiphye-kOGoMDqWTePByxnqHM';

async function test() {
    console.log('Fetching one duel to see columns...');
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await res.json();
        if (res.ok) {
            if (data.length > 0) {
                console.log('✅ Found a duel!');
                console.log('Columns:', Object.keys(data[0]));
            } else {
                console.log('⚠️ No duels found in the table. Trying another way...');
                // If table is empty, we can try to insert a dummy row to see what fails
            }
        } else {
            console.log('❌ Error:', data);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

test();
