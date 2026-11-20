# Light Novel Reader (Integrated Version: Bookshelf + Original Reader)

## Running in StackBlitz
1. Import the entire project into StackBlitz (select "Vite project" or "Upload project").
2. Install the dependencies listed in `package.json`.
3. Run the command `npm run start`; StackBlitz will then open the Web Preview.

## Project Structure
- `index.html`: The bookshelf homepage (retains the original prototype's features, including favorites, recently read, Cover Flow, import, settings, and backup).
- `reader.html`: The reading page, utilizing the original reader UI and image toolbar layout.
- `src/shelf.js`: Logic for the bookshelf and the `Library` adapter layer.
- `src/reader.js`: Handles EPUB.js loading, restoring reading positions, saving reading progress, and managing image scaling/settings.
- `src/shelf.css`: Styles for the bookshelf prototype.
- `src/reader.css`: Styles from the original reader, with necessary adjustments for the reading page.
- `legacy/`: A backup of the original reader's JS/CSS files.

## Data Storage
- EPUB files are stored as binary data in IndexedDB (`lnreader-db`), rather than just storing filenames.
- Book metadata, favorites, and reading progress are saved in `localStorage`.
- The reading position for each book is stored independently as an EPUB CFI.
- Image size and alignment settings for each book are saved on a per-image-resource basis.

## Notes
- Clearing site data in your browser will also delete local EPUB files and reading history; please export your bookshelf as a JSON file periodically for backup.
- The sample books are provided solely to preview the bookshelf UI and do not contain actual EPUB files; clicking on a sample book will prompt you to import a real EPUB file.
- Image settings apply to images found within the EPUB content. Since the XHTML structure and layout can vary between different EPUB files, complex, absolutely-positioned images may require fine-tuning on a per-book basis.