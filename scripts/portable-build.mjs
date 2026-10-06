// Same client output as vite.config.ts, without a bundled configuration file.
import {build} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
await build({configFile:false,build:{outDir:'dist/client',rollupOptions:{output:{manualChunks:{three:['three']}}}}});
await build({configFile:false,esbuild:false,plugins:[{name:'portable-server-typescript',resolveId(source,importer){if(importer&&source.startsWith('.')&&source.endsWith('.js')){const file=path.resolve(path.dirname(importer),source.replace(/\.js$/,'.ts'));if(fs.existsSync(file))return file;}},transform(code,id){if(id.endsWith('.ts'))return {code:ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,map:null};}}],build:{ssr:'server/index.ts',outDir:'dist',emptyOutDir:false,minify:false,rollupOptions:{output:{entryFileNames:'server.js'}}}});
