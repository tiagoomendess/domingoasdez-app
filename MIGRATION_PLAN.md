# Domingo às Dez App

This is a port of the website domingoasdez.com to sveltekit. The idea is for this app to replace the legacy laravel public facing frontend with this web app. This legacy website is built on laravel and can be found locally here on this machine at @E:\Projetos\DomingoAsDez.

## Not in scope:

- Replace the backoffice, where all the data is managed by admins
- Replace all the background processes like cronjobs

This is to start migrating away just the public facing part of the website. Backend stuff and automatic processes will be migrated in a seperate project.

## Old website

- Running on docker, available at http://localhost:8000/
- Local dev DB connection is host=localhost db=dad_db user=root password=rootpassword
    - Don't write anything there please, only read if needed
- Got a local env running on this machine, do docker ps to see what's available

## Media Strategy

For media, images, videos, etc.. it should still be the old site to serve them. Media files are being saved in the old site fylesystem, being served by nginx. The DB only stores relative paths like: /storage/images/image.png. Since I want to keep both running for the transition period, the old site will still be writing, and the new one just reading.

So, when returning a media URL from the new server side to the new frontend to be rendered in the browser, you need to prepend a string with the URL pointing to the old site, so nginx can look up the fylesystem and serve the media file. Use a config for this and ENV VAR.

## Guidelines

The idea is to start developing this new project, with a connection the the same database as the old one, using the same data model. No new migrations on this one, use the data model of the old one.

- The new app should allow to do the same stuff but there will be changes, a lot of pages will be simplified.
- Move away from the top left hamburger manu and left sidenav, that's outdated
- Logins should work out of the box using the stored data
- Generally this new UI should allow to do the same as the old one and conform to the existing data model
- Full translations now available, old site had it but sometimes it just used plain hardcoded strings
- Languages available should be pt-PT as default, then en and fr
- Always try to replicate the same logic as the old website has currently, unless asked otherwise

## Design

- Modern and minimalist, based of Apple Liquid Glass concept
- Light and Dark Mode available
- The new design should be mobile first and then adapt for desktop
- No top sidenav or top navbar, new bottom floating navbar should replace both
- At the top of the page only 2 floating buttons:
  - top left to go back, hidden when not necessary
  - top right light/dark mode toggle

## New Main Tab options

These are the new options that will be on the bottom tab, replacing the old sidenav.

- Home
- Games
- Competitions
- Pages
- Account

These are now the only available actions available at first, but the idea is to still be able to do all of the things before, the remaining pages will be accecible from a second level inside these pages. The idea is to simplify the user experience and not overwelm the user with options right off the bat. MOre complexity will be added if the user requests it.

## Home Page (/)

This home page is supposed to be different from the current one, which feels too complex.

This page will display the news articles and polls at the same time like a feed, ordered by date. Keep in mind there might be things added to the feed in the future, so it should be extendable.

The feed should be like any general social media feed, but at the top there should be chips allowing the users to toggle what they want to see. For now they will only have Articles and Polls, but this will increase in the future. You need to always have at least one chip selected. THe chips should never use more than one row, if they don't fit the screen they should be horizontally scrollable.

Clicking in one article should lead the user to the article. Clicking in the poll should lead the user to the poll voting or results if it's finished.

Pulling down when already at the top, should make refresh the page, like in social media.

## Games (/jogos)

This new games page should combine 2 features of the old website. The day game list and the live games list. It makes no sense to have 2 pages for what is essencially the same thing.

Top of the page there should be a horizontal navbar with dates. By default when entering the mage, "Today" should be selected, and to the left previous dates, to the right next dates. When a user taps one date, the page shouls all the games for that day.

In the "Today" page, if there are games currently being played, they should be at the top in a new section, seperated by competition.

Then all other games should be at the bottom, seperated by competition. If a game is currently being played, it should not appear in the bottom section, it should appear only in the top section.

## Competitions (/competicoes)

Will open a new page with a list of competitions the user can select. This will replace the dropdown menu. The competition list should follow the priority order and show the competition logo to the left.

Clicking each competition takes the user to that competition.

## Pages (/p)

A list of allt he pages available. These are adhoc pages that can be dynamicly added like a little CMS. Clickin one option displays that page.

## Account (/conta)

A page where you should be able to manage your account. Log in or register options should be available if the user is not logged in.

Small settings section that will be always visible regardless if the user is logged in or not, to manage web app stuff that do not require login like:

- Enable or disable back button
- Light or dark mode toggle
- Web app language

If the user is logged in, then it should show a general manage account page, something similar to old (/perfil/editar), but more modern and not in that structure.

## Other pages

The remaining pages, the user is supposed to get to them by navigating these primary ones. For example, the club page could be accessed by the competition or game page, the player page could be accessed by the club page.
