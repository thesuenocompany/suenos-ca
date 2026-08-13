# Contest Admin Workspace V2

Updated 2026-08-07.

This UI-only upgrade makes contest administration easier to navigate without changing contest data or the contest backend.

## Contest dashboard
- Search by campaign, public name, or retailer.
- Filter current contests by Live, Scheduled, Draft, or Closed.
- Summary counts appear above the campaign list.
- Every contest card gets an explicit operational visibility label: PUBLIC ON, PUBLIC OFF, SCHEDULED, CLOSED, or TEMPLATE.
- Retail masters remain grouped with their retailer pages.

## Dedicated editor workspace
Opening Manage hides the campaign list and presents the editor as a dedicated workspace.
A large context banner always identifies the record as one of:
- STANDARD CONTEST
- PHOTO CONTEST
- RETAIL MASTER CAMPAIGN
- RETAILER PAGE

Retail retailer-page context shows the store name and master campaign when available.
Retail masters explain which settings are shared. Retailer pages explain which settings are retailer-specific.
A retailer page includes an Open Master action.

No database migration is required for this UI update.
