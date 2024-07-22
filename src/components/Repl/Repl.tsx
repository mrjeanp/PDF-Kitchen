import styled from '@emotion/styled';
import debounce from 'lodash.debounce';
import dynamic from 'next/dynamic';
import { FC, useEffect, useState } from 'react';

import transpile from '../../lib/transpile';
import media from '../../constants/media';
import CodeEditor from './CodeEditor.fc';

const PDFViewerWithNoSSR = dynamic(import('./PDFViewer'), { ssr: false });

const debounceTranspile = debounce(transpile, 500);

type ReplProps = {
  jsx: string;
  json: string;
  onJSXChange: (jsx: string) => void;
  onJSONChange: (json: string) => void;
  currentLang: 'jsx' | 'json';
  onUrlChange: (url: string) => void;
  onError: (err: Error) => void;
  activeTab: 'code' | 'pdf';
};

const Repl: FC<ReplProps> = ({
  currentLang,
  jsx,
  json,
  onJSONChange,
  onJSXChange,
  onUrlChange,
  onError,
  activeTab,
}) => {
  const [element, setElement] = useState(null);

  const [loading, setLoading] = useState(true);

  const handleEditorLoaded = () => {
    setLoading(false);
  };

  useEffect(() => {
    try {
      const jsonData = JSON.parse(json);

      if (jsx.length === 0) {
        onError(null);
        setElement(null);
      }

      const callback = (value) => {
        // onChange?.(jsx);
        setElement(value);
      };

      debounceTranspile(jsx, jsonData, callback, onError);
      onError(null)
    } catch (err) {
      onError(err);
    }
  }, [jsx, json]);

  let code = jsx;
  let handleCodeChange: (code: string) => void;

  switch (currentLang) {
    case 'json':
      code = json;
      handleCodeChange = onJSONChange;
      break;
    case 'jsx':
      code = jsx;
      handleCodeChange = onJSXChange;
  }

  return (
    <>

      <StyledWrapper className="replWrapper">
        <StyledCodePanel className="codePanel" active={activeTab === 'code'}>
          <CodeEditor
            code={code}
            lang={currentLang}
            onChange={handleCodeChange}
            onLoad={handleEditorLoaded}
          />
        </StyledCodePanel>

        <StyledPDFPanel className="pdfPanel" active={activeTab === 'pdf'}>
          <PDFViewerWithNoSSR
            value={element}
            onUrlChange={onUrlChange}
            onRenderError={onError}
          />
        </StyledPDFPanel>
      </StyledWrapper>
    </>
  );
};

const StyledWrapper = styled.div`
  flex: 1;
  display: flex;
  position: relative;
  height: 100%;

  ${media.mobile} {
    display: initial;
    max-height: calc(100%);
  }
`;

const StyledCodePanel = styled.div<{ active: boolean }>`
  flex: 1;
  overflow: auto;
  position: relative;

  > * {
    height: 100%;
  }

  ${media.mobile} {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: ${(props) => (props.active ? 500 : 250)};
  }
`;

const StyledPDFPanel = styled.div<{ active: boolean }>`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: white;

  display: flex;

  ${media.mobile} {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: ${(props) => (props.active ? 500 : 250)};
  }
`;

export default Repl;
