import Editor from '@monaco-editor/react';

export function CodeEditor({ value, onChange, minHeight = '410px', testId = 'editor-code' }: { value: string; onChange: (value: string) => void; minHeight?: string; testId?: string }) {
  return <div className="min-h-[410px] bg-sidebar" data-testid={testId}><Editor height={minHeight} language="javascript" theme="vs-dark" value={value} onChange={(next) => onChange(next ?? '')} options={{ minimap: { enabled: false }, fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 24, padding: { top: 20, bottom: 20 }, scrollBeyondLastLine: false, smoothScrolling: true, tabSize: 2, wordWrap: 'on' }} /></div>;
}