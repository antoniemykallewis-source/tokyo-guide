import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base:'/tokyo-guide/',plugins:[react()],
  define:{__BUILD_ID__:JSON.stringify(process.env.GITHUB_SHA||'local')},
  build:{target:'es2022',chunkSizeWarningLimit:1800,rollupOptions:{output:{manualChunks(id){if(/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'framework';if(id.includes('mapbox-gl'))return 'mapbox';if(id.includes('three')||id.includes('@react-three'))return 'city-engine';}}}}
});
