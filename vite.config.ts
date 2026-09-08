import { defineConfig } from 'vite';
export default defineConfig({build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'physics',test:/rapier/},{name:'three',test:/node_modules[\\/]three/},{name:'network',test:/trystero/}]}}},chunkSizeWarningLimit:3000}});
