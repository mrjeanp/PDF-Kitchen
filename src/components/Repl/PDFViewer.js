import styled from '@emotion/styled';
import { pdf } from '@react-pdf/renderer';
import src from 'pdfjs-dist/build/pdf.worker.js';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { useAsync } from 'react-use';
import PageNavigator from './PageNavigator';

pdfjs.GlobalWorkerOptions.workerSrc = src;

const PDFViewer = ({ value, onUrlChange, onRenderError }) => {
  const [numPages, setNumPages] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [previousRenderValue, setPreviousRenderValue] = useState(null);

  const render = useAsync(async () => {
    if (!value) return null;

    // actual rendering PDF
    const blob = await pdf(value).toBlob();
    const url = URL.createObjectURL(blob);

    return url;
  }, [value]);

  useEffect(() => onUrlChange(render.value), [render.value]);

  useEffect(() => onRenderError(render.error), [render.error]);

  const onPreviousPage = () => {
    setCurrentPage((prev) => prev - 1);
  };

  const onNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const onDocumentLoad = (d) => {
    setNumPages(d.numPages);
    setCurrentPage((prev) => Math.min(prev, d.numPages));
  };

  const isFirstRendering = !previousRenderValue;

  const isLatestValueRendered = previousRenderValue === render.value;
  const isBusy = render.loading || !isLatestValueRendered;

  const shouldShowTextLoader = isFirstRendering && isBusy;
  const shouldShowPreviousDocument = !isFirstRendering && isBusy;

  return (
    <Wrapper>
      {//shouldShowTextLoader &&
        <Message active={shouldShowTextLoader}>Rendering PDF...</Message>
      }

      {//!render.loading && !value &&
        <Message active={!render.loading && !value}>
          You are not rendering a valid document
        </Message>
      }

      <DocumentWrapper id='pdfViewerWrapper'>
        <PageNavigator
          currentPage={currentPage}
          numPages={numPages}
          onNextPage={onNextPage}
          onPreviousPage={onPreviousPage}
        />
        {shouldShowPreviousDocument && previousRenderValue ? (
          <Document
            key={previousRenderValue}
            className="previous-document"
            file={previousRenderValue}
            loading={null}
          >
            <Page key={currentPage} pageNumber={currentPage} />
          </Document>
        ) : null}
        <Document
          key={render.value}
          className={shouldShowPreviousDocument ? 'rendering-document' : null}
          file={render.value}
          loading={null}
          onLoadSuccess={onDocumentLoad}
        >
          <Page
            key={currentPage}
            pageNumber={currentPage}
            onRenderSuccess={() => setPreviousRenderValue(render.value)}
          />
        </Document>
      </DocumentWrapper>

    </Wrapper>
  );
};

export default PDFViewer;

const Wrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const DocumentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 500;

  .react-pdf__Document {
    &.previous-document {
      canvas {
        opacity: 1;
      }
    }

    &.rendering-document {
      position: absolute;

      .react-pdf__Page {
        box-shadow: none;
      }
    }
  }
`;

const Message = styled.div`
  position: absolute;
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -50%);
  z-index: 1000;
  background-color: #fff;
  transition: all 1s;
  opacity: ${(props) => (props.active ? 1 : 0)};
  pointer-events: ${(props) => (props.active ? 'all' : 'none')};
`;

