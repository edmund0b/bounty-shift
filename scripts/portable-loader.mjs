// Optional TypeScript test loader for Windows environments where tsx's userInfo fails.
import {registerHooks} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
registerHooks({
 resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL){
   const url=new URL(specifier,context.parentURL);
   for(const candidate of [url.href.replace(/\.js$/,'.ts'),url.href+'.ts',url.href+'.tsx']){
    if(candidate.startsWith('file:')&&fs.existsSync(fileURLToPath(candidate)))return {url:candidate,shortCircuit:true};
   }
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.startsWith('file:')&&/\.tsx?$/.test(url))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText};
  return next(url,context);
 }
});
