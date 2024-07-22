import { langs } from '@uiw/codemirror-extensions-langs';
import ReactCodeMirror from '@uiw/react-codemirror';
import { FC, ReactEventHandler } from 'react';
import { gruvboxDark } from '@uiw/codemirror-theme-gruvbox-dark';

langs.json;

type CodeEditorProps = {
  code: string;
  lang: 'jsx' | 'json';
  onChange: (code: string) => void;
  onLoad: ReactEventHandler<HTMLDivElement>;
};

const CodeEditor: FC<CodeEditorProps> = (props) => {
  const { code, lang, onChange, onLoad } = props;
  return (
    <ReactCodeMirror
      theme={gruvboxDark}
      value={code}
      height="100%"
      onChange={onChange}
      extensions={[langs[lang]()]}
      basicSetup
      onLoad={onLoad}
    />
  );
};

export default CodeEditor;
