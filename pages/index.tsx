import styled from '@emotion/styled';
import dynamic from 'next/dynamic';
import { withRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import classNames from 'classnames';
import JsonIcon from '../src/assets/svg/json.svg';
import PdfDownloadIcon from '../src/assets/svg/pdf-download.svg';
import ReactIcon from '../src/assets/svg/react.svg';
import MobileTabs from '../src/components/Repl/MobileTabs';
import media from '../src/constants/media';
import { LZCompress, LZDecompress } from '../src/lib/compress';

import CopyCode from '../src/assets/svg/copy-code.svg';
import LinkCopyIcon from '../src/assets/svg/copy-link.svg';
import GithubIcon from '../src/assets/svg/github.svg';

import packageJson from '../package.json';
import basePath from '../src/lib/path';

const Repl = dynamic(import('../src/components/Repl/Repl'), {
  loading: () => <p>Loading...</p>,
});

const sampleJSX = require('raw-loader!../src/assets/templates/quixote.tsx.txt');
const sampleJSON = require('raw-loader!../src/assets/templates/quixote.json.txt');

const ReplPage = ({ router }) => {
  const [jsx, setJSX] = useState(sampleJSX);

  const [json, setJSON] = useState(sampleJSON);

  const [currentLang, setCurrentLang] = useState<'jsx' | 'json'>('jsx');

  // used to switch between editor and PDFViewer on mobile screen.
  const [activeTab, setActiveTab] = useState<'code' | 'pdf'>('pdf');

  // blob url of the PDF rendered by PDFViewer.js
  const [documentUrl, setDocumentUrl] = useState(null);

  const [error, setError] = useState(null);

  const copyToClipboard = useCallback(async (text: string, msg?: string) => {
    if (typeof window === undefined) return;
    await window.navigator.clipboard.writeText(text);
    alert(msg ?? 'Value copied to clipboard');
  }, []);

  // get query params
  const query = router.query;

  // Load samples
  const loadSamples = useCallback(async () => {
    let initJSX = query.jsx ? LZDecompress(query.jsx) : await sampleJSX;
    let initJSON = query.json ? LZDecompress(query.json) : sampleJSON;

    setJSX(initJSX);
    setJSON(initJSON);
  }, [query.jsx, query.json]);

  useEffect(() => {
    loadSamples();
  }, [query.jsx, query.json]);

  // SHARE BUTTON URL
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.href}?json=${LZCompress(json)}&jsx=${LZCompress(
      jsx,
    )}`;
  }, [jsx, json]);

  // if (mount.loading) return null;

  return (
    <Main>
      <Nav>
        <button
          className={classNames({
            active: currentLang === 'jsx',
          })}
          title="React Code"
          onClick={() => setCurrentLang('jsx')}
        >
          <ReactIcon width={32} height={32} />
        </button>

        <button
          className={classNames({
            active: currentLang === 'json',
          })}
          title="JSON Data"
          onClick={() => setCurrentLang('json')}
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

        <button title="Copy JSX" onClick={() => copyToClipboard(jsx)}>
          <CopyCode height={28} />
        </button>

        <button
          title="Copy Share Link"
          onClick={() => copyToClipboard(shareUrl)}
        >
          <LinkCopyIcon height={28} />
        </button>

        <a title="Go to Github" target="_blank" href={packageJson.homepage}>
          <GithubIcon style={{ color: 'black' }} height={32} />
        </a>
        <a
          title="React PDF Docs"
          href="https://react-pdf.org/components"
          target="_blank"
        >
          <img src={basePath() + '/images/logo.png'} height={32} />
        </a>
      </Nav>
      <Section>
        <MobileTabs activeTab={activeTab} onTabClick={setActiveTab} />
        <Repl
          json={json}
          jsx={jsx}
          onJSONChange={setJSON}
          onJSXChange={setJSX}
          currentLang={currentLang}
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
