import { Layout, Tabs } from 'antd';
import { SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import OptimizerPanel from './components/OptimizerPanel';
import DetectorPanel from './components/DetectorPanel';
import './App.css';

const { Header, Content } = Layout;

export default function App() {
  const items = [
    {
      key: 'optimizer',
      label: (
        <span>
          <ThunderboltOutlined />
          <span style={{ marginLeft: 8 }}>越狱优化器</span>
        </span>
      ),
      children: <OptimizerPanel />,
    },
    {
      key: 'detector',
      label: (
        <span>
          <SafetyOutlined />
          <span style={{ marginLeft: 8 }}>安全检测器</span>
        </span>
      ),
      children: <DetectorPanel />,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header 
        style={{ 
          background: '#fff',
          padding: '0 48px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <SafetyOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
        <h1 style={{ 
          color: '#262626', 
          margin: 0, 
          fontSize: '20px',
          fontWeight: 500
        }}>
          XGuard Jailbreak Optimizer
        </h1>
      </Header>
      <Content style={{ 
        padding: '24px 48px', 
        maxWidth: '1920px', 
        margin: '0 auto', 
        width: '100%'
      }}>
        <Tabs 
          items={items} 
          size="large"
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '16px 24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
            minHeight: 'calc(100vh - 120px)'
          }}
        />
      </Content>
    </Layout>
  );
}
