import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme?: 'vs-dark' | 'light';
  readOnly?: boolean;
}

export function CodeEditor({
  language,
  value,
  onChange,
  theme = 'vs-dark',
  readOnly = false,
}: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(val) => onChange(val || '')}
      theme={theme}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        automaticLayout: true,
        readOnly,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 4,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}

export default CodeEditor;
