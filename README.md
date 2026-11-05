# Crystal Dukes Listings Platform

This package contains the public property catalogue and the private administrator dashboard.

## Included files

- `index.html` — public listings page
- `admin.html` — private sign-in and listing management page
- `js/config.js` — already connected to the Supabase project URL and public publishable key you supplied
- `js/listings.js` — public listing retrieval, filtering, sorting, and property details
- `js/admin.js` — Supabase sign-in, property create/edit/archive, and photo uploads
- `css/styles.css` — responsive navy, gold, and crimson styling
- `supabase/schema.sql` — reference schema only; your database tables and policies have already been created in the Supabase dashboard

## Important: database compatibility

The frontend is configured for the existing `public.properties` columns:
`title`, `description`, `price`, `address`, `city`, `state`, `zip_code`, `bedrooms`, `bathrooms`, `square_feet`, `property_type`, `status`, `featured`, `published`, and `photos`.

It uses the `property-photos` public Storage bucket and the `public.is_listings_admin()` authorization function already configured in your Supabase project.

## Before publishing

1. Open `js/config.js` and confirm the Project URL and publishable key.
2. Confirm both administrator users have rows in `public.profiles` with role `admin`.
3. Test the dashboard locally or on a private GitHub Pages preview.
4. Confirm login, property creation, photo upload, publishing, and public display before sharing the public URL.

## Deploying with GitHub Pages

1. Create a GitHub repository for this website.
2. Upload the contents of the `crystal-dukes-listings-platform` folder (not the outer folder itself, if you want the site at the repository root).
3. In the repository, open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
5. GitHub Pages will provide the public website URL after deployment.

The private dashboard is at `/admin.html`. Supabase Authentication and Row Level Security protect access.

## Security

The publishable key is intended for browser use when Row Level Security and policies are correctly configured. Never put a Supabase secret key, service-role key, or database password in this project or in GitHub.


## Crystal Dukes branding
The public listings page and admin dashboard use the burgundy, black, warm ivory, crimson, and gold palette sampled from the supplied Crystal Dukes website screenshots. `assets/crystal-dukes-logo.jpg` is a temporary crop from the supplied website screenshot; replace it with the original high-resolution transparent PNG/SVG logo when available.
