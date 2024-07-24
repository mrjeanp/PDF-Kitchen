import styled from '@emotion/styled';
import dynamic from 'next/dynamic';
import { withRouter } from 'next/router';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import classNames from 'classnames';
import MobileTabs from '../src/components/Repl/MobileTabs';
import media from '../src/constants/media';

// SVG Icons
import CopyIcon from '../src/assets/svg/copy.svg';
import GithubIcon from '../src/assets/svg/github.svg';
import JsonIcon from '../src/assets/svg/json.svg';
import PdfDownloadIcon from '../src/assets/svg/pdf-download.svg';
import ReactIcon from '../src/assets/svg/react.svg';
import UploadIcon from '../src/assets/svg/upload.svg';

import copyToClipboard from '../src/lib/copyToClipboard.fn';
import { uri } from '../src/lib/path';

const app = require('../app');

const Repl = dynamic(import('../src/components/Repl/Repl'), {
  loading: () => <p>Loading...</p>,
});

const sampleJSX = require('raw-loader!../src/assets/templates/cv.jsx.txt');
const sampleJSON = require('raw-loader!../src/assets/templates/cv.json.txt');

const ReplPage = ({ router }) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const [jsx, setJSX] = useState(sampleJSX);

  const [json, setJSON] = useState(sampleJSON);

  const [editorLang, setEditorLang] = useState<'jsx' | 'json'>('jsx');

  // for clipboard copying and file input {
  const codes = { jsx, json };
  const setCode = {
    jsx: setJSX,
    json: setJSON,
  };
  const currentCode = codes[editorLang];
  // }

  // used to switch between CodeEditor and PDFViewer on mobile screen.
  const [activeTab, setActiveTab] = useState<'code' | 'pdf'>('pdf');

  // blob url of the PDF rendered by PDFViewer.js
  const [documentUrl, setDocumentUrl] = useState(null);

  const [error, setError] = useState(null);

  // retrieve and save codes
  useEffect(() => {
    const savedJSX = window.localStorage.getItem('jsx');
    const savedJSON = window.localStorage.getItem('json');

    if (jsx !== sampleJSX || json !== sampleJSON) {
      jsx && window.localStorage.setItem('jsx', jsx);
      json && window.localStorage.setItem('json', json);
    } else if (jsx !== savedJSX || json !== savedJSON) {
      savedJSON !== null && setJSON(savedJSON);
      savedJSX !== null && setJSX(savedJSX);
    }
  }, [jsx, json]);

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const { target: input } = event;

      const files = input.files;

      if (files) {
        const file = files.item(0);
        const extension = file.name.split('.').pop();
        if (extension === 'jsx' || extension === 'json') {
          const content = await file.text();
          setCode[extension](content);
          setEditorLang(extension)
        } else {
          setError(new Error('Unsuported file type'));
          setTimeout(() => setError(null), 3000);
        }
        input.value = null;
      }
    },
    [],
  );

  return (
    <Main>
      <Nav>
        <button
          className={classNames({
            active: editorLang === 'jsx',
          })}
          title="JSX Code"
          onClick={() => setEditorLang('jsx')}
        >
          <ReactIcon width={32} height={32} />
        </button>

        <button
          className={classNames({
            active: editorLang === 'json',
          })}
          title="JSON Data"
          onClick={() => setEditorLang('json')}
        >
          <JsonIcon width={28} height={28} />
        </button>

        <a
          title="Download PDF"
          href={documentUrl}
          download={'document.pdf'}
          target="_blank"
        >
          <PdfDownloadIcon height={32} />
        </a>

        <button title="Upload JSON/JSX" onClick={() => fileInput.current.click()}>
          <UploadIcon height={32} />
          <input
            onChange={handleFileInputChange}
            ref={fileInput}
            type="file"
            accept=".jsx, .json"
            hidden
          />
        </button>

        <button
          title="Copy code"
          onClick={() =>
            copyToClipboard(currentCode, `${editorLang.toUpperCase()} copied`)
          }
        >
          <CopyIcon height={32} />
        </button>

        <a title="Go to Github" target="_blank" href={app.repository}>
          <GithubIcon style={{ color: 'black' }} height={32} />
        </a>
        <a
          title="React PDF Docs"
          href="https://react-pdf.org/components"
          target="_blank"
        >
          <img src={uri('/images/logo.png')} height={32} />
        </a>
      </Nav>
      <Section>
        <MobileTabs activeTab={activeTab} onTabClick={setActiveTab} />
        <Repl
          json={json}
          jsx={jsx}
          onJSONChange={setJSON}
          onJSXChange={setJSX}
          currentLang={editorLang}
          activeTab={activeTab}
          onUrlChange={setDocumentUrl}
          onError={setError}
        />
      </Section>
      {error && <ReplError>{String(error)}</ReplError>}
    </Main>
  );
};

export default withRouter(ReplPage);

const Main = styled.main`
  display: flex;
  height: 100vh;
  width: 100vw;
  display: grid;

  display: grid;
  grid-template-columns: 60px repeat(2, 1fr);
  grid-template-rows: 1fr auto;

  ${media.mobile} {
    grid-template-columns: 1fr;
    grid-template-rows: 60px 1fr;
  }
`;
const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  align-items: center;
  align-items: stretch;

  background-color: #e9e9e9;

  grid-row: 1 / -1;
  grid-column: 1 / span 1;

  & > button,
  & > a {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
    cursor: pointer;

    &.active {
      background: #f22300;
      color: white !important;
    }
    &:hover:not(.active) {
      background: #c5c5c5;
    }
  }

  ${media.mobile} {
    padding: 0 1rem;
    flex-direction: row;

    grid-column: 1 / span 1;
    grid-row: 1 / span 1;
  }
`;
const Section = styled.section`
  grid-row: 1;
  grid-column: 2 / -1;
  overflow: auto;

  display: flex;
  flex-direction: column;

  ${media.mobile} {
    width: 100vw;
    grid-row: 2 / -1;
    grid-column: 1 / -1;
  }
`;

const ReplError = styled.div`
  font-family: 'Courier New', Courier, monospace;
  font-size: 1rem;
  font-weight: bold;
  /* word-spacing: 1px; */
  color: white;
  padding: 8px;
  display: flex;
  align-items: center;
  background: ${(p) => p.theme['red']};

  grid-row: 2 / span 1;
  grid-column: 2 / -1;

  height: 50px;
`;
