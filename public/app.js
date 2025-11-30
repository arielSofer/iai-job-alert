document.addEventListener('DOMContentLoaded', async () => {
    const locationSelect = document.getElementById('location');
    const form = document.getElementById('subscribeForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');

    // Fetch locations
    try {
        const response = await fetch('/api/locations');
        const locations = await response.json();

        const container = document.getElementById('locations-container');
        container.innerHTML = ''; // Clear loading

        if (locations.length === 0) {
            container.innerHTML = '<div class="error">לא נמצאו אזורים</div>';
            return;
        }

        locations.forEach(loc => {
            const label = document.createElement('label');
            label.className = 'location-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = loc;
            checkbox.name = 'locations';

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(loc));

            container.appendChild(label);
        });
    } catch (err) {
        console.error('Error fetching locations:', err);
        document.getElementById('locations-container').innerHTML = '<div class="error">שגיאה בטעינת האזורים</div>';
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;

        // Get selected locations
        const checkboxes = document.querySelectorAll('input[name="locations"]:checked');
        const selectedLocations = Array.from(checkboxes).map(cb => cb.value);

        if (selectedLocations.length === 0) {
            messageDiv.className = 'message error';
            messageDiv.textContent = 'אנא בחר לפחות אזור אחד.';
            messageDiv.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'נרשם...';
        messageDiv.style.display = 'none';

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, locations: selectedLocations })
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.className = 'message success';
                messageDiv.textContent = 'נרשמת בהצלחה! תקבל עדכון כשתיפתח משרה באזורים שבחרת.';
                form.reset();
                // Uncheck all
                document.querySelectorAll('input[name="locations"]').forEach(cb => cb.checked = false);
            } else {
                messageDiv.className = 'message error';
                messageDiv.textContent = data.error || 'שגיאה בהרשמה';
            }
        } catch (err) {
            console.error('Error:', err);
            messageDiv.className = 'message error';
            messageDiv.textContent = 'שגיאה בתקשורת עם השרת';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'הרשמה להתראות';
            messageDiv.style.display = 'block';
        }
    });
});
