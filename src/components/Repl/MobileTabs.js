import styled from '@emotion/styled';

import media from '../../constants/media';

const Wrapper = styled.div`
  height: 60px;
  color: white;
  display: none;
  flex-direction: row;
  justify-content: space-between;
  background: ${({ theme }) => theme.red};


  ${media.mobile} {
    display: flex;
  }


`;


const Tabs = styled.div`
  flex: 1;
  display: flex;
  height: 60px;
  color: white;
  display: none;
  flex-direction: row;
  justify-content: space-between;
  background: ${({ theme }) => theme.red};


  ${media.mobile} {
    display: flex;
  }
`;

const Tab = styled.button`
  flex: 1;
  border: 0px;
  color: white;
  outline: none;
  cursor: pointer;
  font-size: 16px;
  text-decoration: none;
  font-family: 'Source Sans Pro';
  transition: color 0.2s, background 0.2s;
  opacity: ${({ active }) => (active ? 0.8 : 1)};
  background: ${({ active, theme }) =>
    active ? theme.darkRed : 'transparent'};

  display: flex;
  justify-content: center;
  align-items: center;
`;

const MobileTabs = ({ activeTab, onTabClick }) => (
  <Wrapper>
    <Tabs>
      <Tab active={activeTab === 'code'} onClick={() => onTabClick('code')}>
        Code
      </Tab>
      <Tab active={activeTab === 'pdf'} onClick={() => onTabClick('pdf')}>
        PDF
      </Tab>
    </Tabs>
  </Wrapper>
);

export default MobileTabs;
