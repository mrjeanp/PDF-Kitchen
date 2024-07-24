import styled from '@emotion/styled';

import Angle from '../../assets/svg/angle.svg';

const Wrapper = styled.div`
  display: flex;
  background-color: white;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.black};
  padding: 1rem 0;
`;

const PageIndicator = styled.span`
  margin: 0px 12px;
`;

const PageNavigator = ({
  currentPage,
  numPages,
  onPreviousPage,
  onNextPage,
}) => {
  // if (numPages <= 1) return null;

  return (
    <Wrapper id='PageNavigator'>
      {
        currentPage !== 1 &&
        <button onClick={onPreviousPage} >
          <Angle height={16} style={{ transform: "rotate(180deg)" }} />
        </button>
      }

      <PageIndicator>{`Page ${currentPage} / ${numPages}`}</PageIndicator>

      {
        currentPage < numPages &&
        <button onClick={onNextPage}>
          <Angle height={16} />
        </button>
      }

    </Wrapper>
  );
};

export default PageNavigator;
