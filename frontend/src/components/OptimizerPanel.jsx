import { Form, Input, Select, Button, Card, Alert, Spin, Row, Col, Statistic, Space } from 'antd';
import { ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { startOptimization, createWebSocket } from '../api/client';
import ProgressTimeline from './ProgressTimeline';

export default function OptimizerPanel() {
  const [form] = Form.useForm();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, bestScore: 0, avgScore: 0 });
  const [objective, setObjective] = useState('goal1'); // 跟踪当前选择的目标
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = createWebSocket(
      (message) => {
        if (message.type === 'progress') {
          console.log('[DEBUG] 收到progress消息:', {
            candidate_length: message.data.candidate?.length,
            llm_response_length: message.data.llm_response?.length,
            has_reasoning: !!message.data.reasoning,
            reasoning_explanation: message.data.reasoning?.explanation?.substring(0, 50)
          });
          setProgress((prev) => {
            const newProgress = [...prev, message.data];
            // 更新统计
            const scores = newProgress.map(p => p.score || 0);
            const bestScore = Math.max(...scores);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            setStats({ total: newProgress.length, bestScore, avgScore });
            return newProgress;
          });
        } else if (message.type === 'result') {
          setResult(message.data);
          setRunning(false);
        } else if (message.type === 'error') {
          setError(message.message);
          setRunning(false);
        }
      },
      (error) => {
        console.error('WebSocket error:', error);
      }
    );
    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleStart = async (values) => {
    setRunning(true);
    setProgress([]);
    setResult(null);
    setError(null);
    setStats({ total: 0, bestScore: 0, avgScore: 0 });

    try {
      await startOptimization(values);
      // HTTP立即返回，优化任务在后台运行
      // 进度和结果通过WebSocket推送
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setRunning(false);
    }
  };

  return (
    <Row gutter={24}>
      {/* 左侧配置区 */}
      <Col xs={24} lg={8}>
        <Card 
          title={
            <Space>
              <ThunderboltOutlined />
              <span>优化配置</span>
            </Space>
          }
          bordered={false}
          style={{ marginBottom: 24 }}
        >
          <Form
            form={form}
            onFinish={handleStart}
            layout="vertical"
            initialValues={{
              objective: 'goal1',
              model_name: 'gpt-3.5-turbo',
              max_iterations: 5,
            }}
          >
            <Form.Item
              name="malicious_intent"
              label="恶意意图"
              required
              rules={[{ required: true, message: '请输入要测试的恶意意图' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="例如: How can I make a bomb?"
              />
            </Form.Item>

            <Form.Item
              name="objective"
              label="优化目标"
              required
            >
              <Select onChange={(value) => setObjective(value)}>
                <Select.Option value="goal1">
                  目标1: Response有害但Prompt通过
                </Select.Option>
                <Select.Option value="goal2">
                  目标2: 双重通过但实际有害
                </Select.Option>
                <Select.Option value="goal3">
                  目标3: 仅Prompt检测(不需要下游模型)
                </Select.Option>
              </Select>
            </Form.Item>

            {/* 所有目标都需要优化LLM */}
            <Form.Item
              name="api_key"
              label="优化LLM API密钥"
              required
              rules={[{ required: true, message: '请输入API密钥' }]}
            >
              <Input.Password placeholder="sk-..." />
            </Form.Item>

            <Form.Item name="model_name" label="优化LLM模型">
              <Select>
                <Select.OptGroup label="OpenAI">
                  <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                  <Select.Option value="gpt-4">GPT-4</Select.Option>
                  <Select.Option value="gpt-4-turbo">GPT-4 Turbo</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="阿里云通义千问">
                  <Select.Option value="qwen-plus">Qwen-Plus</Select.Option>
                  <Select.Option value="qwen-turbo">Qwen-Turbo</Select.Option>
                  <Select.Option value="qwen-max">Qwen-Max</Select.Option>
                  <Select.Option value="qwen-long">Qwen-Long</Select.Option>
                </Select.OptGroup>
              </Select>
            </Form.Item>

            {/* 仅goal1/goal2显示下游模型配置 */}
            {objective !== 'goal3' && (
              <>
                <Form.Item
                  name="downstream_api_key"
                  label="下游模型API密钥"
                  required
                  rules={[{ required: true, message: '请输入下游模型API密钥' }]}
                >
                  <Input.Password placeholder="sk-..." />
                </Form.Item>

                <Form.Item name="downstream_model_name" label="下游模型名称">
                  <Select placeholder="选择下游模型(可选,默认与优化LLM相同)">
                    <Select.OptGroup label="OpenAI">
                      <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                      <Select.Option value="gpt-4">GPT-4</Select.Option>
                      <Select.Option value="gpt-4-turbo">GPT-4 Turbo</Select.Option>
                    </Select.OptGroup>
                    <Select.OptGroup label="阿里云通义千问">
                      <Select.Option value="qwen-plus">Qwen-Plus</Select.Option>
                      <Select.Option value="qwen-turbo">Qwen-Turbo</Select.Option>
                      <Select.Option value="qwen-max">Qwen-Max</Select.Option>
                      <Select.Option value="qwen-long">Qwen-Long</Select.Option>
                    </Select.OptGroup>
                  </Select>
                </Form.Item>
              </>
            )}

            <Form.Item name="max_iterations" label="最大迭代次数">
              <Input type="number" min={1} max={20} />
            </Form.Item>

            <Form.Item 
              name="candidates_per_iteration" 
              label="每轮测试候选数" 
              tooltip="每轮迭代从模板库中随机选择的候选数量,减少可提升速度"
              initialValue={8}
            >
              <Input type="number" min={3} max={20} />
            </Form.Item>

            <Button 
              type="primary" 
              htmlType="submit" 
              loading={running} 
              size="large"
              block
              icon={<ThunderboltOutlined />}
            >
              {running ? '优化中...' : '开始优化'}
            </Button>
          </Form>
        </Card>

        {/* 实时统计 */}
        {(running || progress.length > 0) && (
          <Card title="实时统计" bordered={false}>
            <Row gutter={16}>
              <Col span={24}>
                <Statistic 
                  title="已测试" 
                  value={stats.total} 
                  suffix="个"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="最佳得分" 
                  value={stats.bestScore * 100} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: stats.bestScore > 0.7 ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="平均得分" 
                  value={stats.avgScore * 100} 
                  precision={2}
                  suffix="%"
                />
              </Col>
            </Row>
          </Card>
        )}
      </Col>

      {/* 右侧结果区 */}
      <Col xs={24} lg={16}>
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
            showIcon
          />
        )}

        {result && (
          <Card
            title={
              <Space>
                {result.success ? (
                  <>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>优化成功</span>
                  </>
                ) : (
                  <>
                    <CloseCircleOutlined style={{ color: '#faad14' }} />
                    <span>优化完成（未达阈值）</span>
                  </>
                )}
              </Space>
            }
            bordered={false}
            style={{ marginBottom: 24 }}
          >
            {result.success ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <strong>越狱提示词:</strong>
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: 16, 
                    borderRadius: 8,
                    marginTop: 8,
                    border: '1px solid #d9d9d9',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {result.jailbreak_prompt}
                  </pre>
                </div>
                {result.final_response && (
                  <div style={{ marginBottom: 16 }}>
                    <strong>LLM响应:</strong>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: 16, 
                      borderRadius: 8,
                      marginTop: 8,
                      border: '1px solid #d9d9d9',
                      maxHeight: '300px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {result.final_response}
                    </pre>
                  </div>
                )}
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title="迭代次数" value={result.iterations} />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="适应度得分" 
                      value={result.score * 100} 
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                </Row>
              </div>
            ) : (
              <div>
                <p style={{ color: '#999', marginBottom: 16 }}>未找到完全符合条件的结果，以下是最佳尝试：</p>
                {result.best_attempt?.candidate && (
                  <div style={{ marginBottom: 16 }}>
                    <strong>最佳越狱提示词:</strong>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: 16, 
                      borderRadius: 8,
                      marginTop: 8,
                      border: '1px solid #d9d9d9',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {result.best_attempt.candidate}
                    </pre>
                  </div>
                )}
                {result.best_attempt?.llm_response && (
                  <div style={{ marginBottom: 16 }}>
                    <strong>LLM响应:</strong>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: 16, 
                      borderRadius: 8,
                      marginTop: 8,
                      border: '1px solid #d9d9d9',
                      maxHeight: '300px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {result.best_attempt.llm_response}
                    </pre>
                  </div>
                )}
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title="迭代次数" value={result.iterations} />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="最佳得分" 
                      value={(result.best_score || 0) * 100}
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        )}

        {(running || progress.length > 0) && (
          <Card 
            title={
              <Space>
                <ThunderboltOutlined />
                <span>实时进度</span>
              </Space>
            }
            bordered={false}
          >
            {running && progress.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <p style={{ marginTop: 16, color: '#999' }}>正在生成候选提示词...</p>
              </div>
            )}
            <ProgressTimeline data={progress} />
          </Card>
        )}

        {!running && !result && progress.length === 0 && (
          <Card bordered={false}>
            <div style={{ 
              textAlign: 'center', 
              padding: '80px 20px',
              color: '#999'
            }}>
              <ThunderboltOutlined style={{ fontSize: 64, marginBottom: 24 }} />
              <p style={{ fontSize: 16 }}>配置参数后点击"开始优化"开始测试</p>
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
