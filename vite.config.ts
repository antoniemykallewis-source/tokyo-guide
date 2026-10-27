import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base:'/tokyo-guide/',plugins:[react()],
  define:{__BUILD_ID__:JSON.stringify(process.env.GITHUB_SHA||'local')},
  // Let Vite split dynamic imports. Manual vendor chunks pulled React into the
  // city engine and made the supposedly deferred 3D bundle a startup dependency.
  build:{target:'es2022',chunkSizeWarningLimit:1800}
});
