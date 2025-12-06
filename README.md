# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/293313e3-5c5f-4af0-a6ee-4f2e5704ff3a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/293313e3-5c5f-4af0-a6ee-4f2e5704ff3a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Backend & Supabase setup

1) Install dependencies  
```sh
npm install
```

2) Configure environment variables (copy `env.example` to `.env.local` or export in your shell):
- `VITE_SUPABASE_URL` – your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – anon key for client-side reads
- `SUPABASE_SERVICE_ROLE_KEY` – service key for the backend API (optional, for server-side operations)
- `SUPABASE_URL` – same as `VITE_SUPABASE_URL` (used by the API server)
- `VITE_API_URL` – optional, defaults to `http://localhost:4000` if you run the API server

3) Create the database schema and seed data in Supabase:
- Go to your Supabase project → SQL Editor
- Run the SQL in `supabase/schema.sql` to create all tables
- Then run `supabase/seed.sql` to preload sample CRM data (optional)

4) Start the lightweight API server (optional - frontend can use Supabase directly)  
```sh
npm run server   # defaults to http://localhost:4000
```

5) Start the frontend (it will read directly from Supabase; if Supabase is missing it falls back to the API, then to mock data)  
```sh
npm run dev
```

## Features

### ✅ Full CRUD Operations
- **Properties**: Create, edit, delete properties. All changes sync to Supabase immediately.
- **Leads**: View leads in pipeline/list view. Update lead stages by clicking on lead cards.
- **Site Visits**: Schedule and manage property visits.
- **Follow-ups**: Create and track follow-up tasks.
- **Workflows**: Toggle automation workflows on/off.

### ✅ Dynamic Data
- All data is fetched from Supabase in real-time
- Changes are automatically reflected across all views
- Data refreshes on window focus and manual refresh
- Proper data transformation between Supabase (snake_case) and frontend (camelCase)

### ✅ Data Flow
1. Frontend queries Supabase directly (if configured)
2. Falls back to API server (if Supabase not available)
3. Falls back to mock data (for development without backend)

### ✅ How to Add Data
- **Properties**: Click "Add Property" button → Fill form → Save (appears immediately)
- **Leads**: Use the "Add Lead" button (when implemented) or add directly in Supabase
- All data added in Supabase will appear on the site automatically after refresh

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/293313e3-5c5f-4af0-a6ee-4f2e5704ff3a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
