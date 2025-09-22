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

      // Reset the activity select so we don't duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML: a list with a delete button next to each participant,
        // otherwise a small friendly placeholder.
        const participantsList = details.participants.length
          ? `<ul class="participants-list">${details.participants
              .map(
                (p) =>
                  `<li><span class="participant-email">${p}</span><button class="participant-delete" data-email="${p}" title="Unregister ${p}" aria-label="Unregister ${p}">×</button></li>`
              )
              .join("")}</ul>`
          : `<p class="participants-empty">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section" aria-label="participants">
            <h5>Participants</h5>
            ${participantsList}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Attach delete handlers for any delete buttons in this activity card
        const deleteButtons = activityCard.querySelectorAll(".participant-delete");
        deleteButtons.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const email = btn.getAttribute("data-email");

            // Optimistically disable button to prevent double clicks
            btn.disabled = true;

            try {
              const res = await fetch(
                `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`,
                {
                  method: "DELETE",
                }
              );

              const result = await res.json();

              if (res.ok) {
                // Show a short success message
                messageDiv.textContent = result.message || `Unregistered ${email}`;
                messageDiv.className = "success";
                messageDiv.classList.remove("hidden");

                // Update the DOM for this activity card only
                // Remove the participant's <li> from the participants list
                const li = btn.closest("li");
                if (li) {
                  const ul = li.parentElement;
                  li.remove();
                  // If the list is now empty, show the "No participants yet" placeholder
                  if (ul && ul.children.length === 0) {
                    const emptyMsg = document.createElement("p");
                    emptyMsg.className = "participants-empty";
                    emptyMsg.textContent = "No participants yet";
                    ul.parentElement.replaceChild(emptyMsg, ul);
                  }
                }
                // Update the spots left
                // Find the <p> with "<strong>Availability:</strong>"
                // ":contains" is not a standard selector, so use a workaround
                const availabilityPs = activityCard.querySelectorAll("p");
                for (const p of availabilityPs) {
                  if (p.querySelector("strong") && p.querySelector("strong").textContent.trim() === "Availability:") {
                    // Parse the current spots left, increment by 1
                    const match = p.textContent.match(/(\d+)\s+spots left/);
                    if (match) {
                      const spotsLeft = parseInt(match[1], 10) + 1;
                      p.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
                    }
                    break;
                  }
                }
                messageDiv.textContent = result.detail || "Failed to unregister participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                btn.disabled = false;
              }

              // Hide message after 4 seconds
              setTimeout(() => {
                messageDiv.classList.add("hidden");
              }, 4000);
            } catch (err) {
              console.error("Error unregistering participant:", err);
              messageDiv.textContent = "Failed to unregister participant. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
              btn.disabled = false;
            }
          });
        });
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

        // Refresh activities to show the newly signed up participant
        fetchActivities();
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

  // Initialize app
  fetchActivities();
});
