# Schedule reminders

The Schedule tab now supports timed reminders independently of the focus timer.

- Each scheduled block has a **Remind me at the scheduled time** checkbox, enabled by default.
- Click **Enable browser reminders** and grant the browser notification permission to allow operating-system notifications on supported browsers.
- When notifications are unavailable or blocked, the dashboard displays an in-page reminder while it is open.
- The reminder checker runs in the open dashboard and rechecks when the page becomes visible/focused. A missed same-day reminder can appear as overdue when the dashboard is reopened later that day.
- The notification service worker displays notifications requested by the page and returns the user to the dashboard when clicked.

## Important limitation

This is a static website. It cannot guarantee notifications after the tab/browser is fully closed or the device is asleep. Reliable browser-closed reminders require a push-notification service/backend and subscription handling; the service worker alone cannot schedule a persistent timer. This implementation does not claim otherwise. Notifications also depend on the browser/device allowing notifications and the page remaining open enough to check due times.

Schedule reminder data is stored separately in this browser's localStorage under `maxdashboard:schedule:v1`. It is distinct from the focus timer and from the dashboard's main backup state.

## Dashboard notification center
When a Schedule reminder becomes due or a focus timer completes while the dashboard is running, the event is also recorded in the dashboard-wide notification center. The center is a local in-browser history, not a server push service. Browser-closed delivery is not guaranteed.
