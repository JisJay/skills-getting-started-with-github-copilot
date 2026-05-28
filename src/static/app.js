document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section
        let participantsHtml = '<div class="participants-section">';
        participantsHtml += '<h5>Participants</h5>';
        if (!details.participants || details.participants.length === 0) {
          participantsHtml += '<p class="info">No participants yet.</p>';
        } else {
          participantsHtml += '<ul class="participants-list">';
          details.participants.forEach((p) => {
            participantsHtml += `<li><span class="participant-name">${p}</span><button class="participant-remove" data-email="${p}" data-activity="${name}" aria-label="Remove participant">✖</button></li>`;
          });
          participantsHtml += '</ul>';
        }
        participantsHtml += '</div>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegate click handler to remove participants
  activitiesList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.participant-remove');
    if (!btn) return;

    const email = btn.dataset.email;
    const activityName = btn.dataset.activity;

    if (!email || !activityName) return;

    // Custom confirmation modal (avoids native dialog prefix)
    const confirmed = await customConfirm(`Unregister ${email}?`);
    if (!confirmed) return;

    try {
      btn.disabled = true;
      const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, { method: 'POST' });
      const result = await resp.json().catch(() => ({}));

      if (resp.ok) {
        messageDiv.textContent = result.message || 'Participant removed';
        messageDiv.className = 'message success';
        messageDiv.classList.remove('hidden');
        // Refresh activities to reflect change
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'message error';
        messageDiv.classList.remove('hidden');
        btn.disabled = false;
      }

      setTimeout(() => messageDiv.classList.add('hidden'), 5000);
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant. Please try again.';
      messageDiv.className = 'message error';
      messageDiv.classList.remove('hidden');
      btn.disabled = false;
    }
  });

  // Custom confirm modal (returns a Promise<boolean>)
  function customConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';

      const msg = document.createElement('p');
      msg.className = 'confirm-message';
      msg.textContent = message;

      const actions = document.createElement('div');
      actions.className = 'confirm-actions';

      const btnCancel = document.createElement('button');
      btnCancel.className = 'confirm-cancel';
      btnCancel.textContent = 'Cancel';

      const btnOk = document.createElement('button');
      btnOk.className = 'confirm-ok';
      btnOk.textContent = 'Unregister';

      actions.appendChild(btnCancel);
      actions.appendChild(btnOk);
      dialog.appendChild(msg);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      function cleanup(value) {
        document.body.removeChild(overlay);
        resolve(value);
      }

      btnCancel.addEventListener('click', () => cleanup(false));
      btnOk.addEventListener('click', () => cleanup(true));

      // Close on Escape
      function onKey(e) {
        if (e.key === 'Escape') {
          cleanup(false);
        }
      }
      document.addEventListener('keydown', onKey, { once: true });
    });
  }

  // Initialize app
  fetchActivities();
});
