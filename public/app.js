document.addEventListener('DOMContentLoaded', async () => {
    const locationSelect = document.getElementById('location');
    const form = document.getElementById('subscribeForm');
    const messageDiv = document.getElementById('message');

    // Fetch locations
    try {
        const response = await fetch('/api/locations');
        const locations = await response.json();

        locationSelect.innerHTML = '<option value="" disabled selected>בחר אזור מגורים</option>';
        locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            locationSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching locations:', error);
        locationSelect.innerHTML = '<option value="" disabled>שגיאה בטעינת אזורים</option>';
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const location = locationSelect.value;

        if (!location) {
            showMessage('נא לבחור אזור מגורים', 'error');
            return;
        }

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, location })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('נרשמת בהצלחה! תקבל עדכון כשתיפתח משרה באזורך.', 'success');
                form.reset();
            } else {
                showMessage(data.error || 'אירעה שגיאה בהרשמה', 'error');
            }
        } catch (error) {
            console.error('Error subscribing:', error);
            showMessage('שגיאת תקשורת', 'error');
        }
    });

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
    }
});
