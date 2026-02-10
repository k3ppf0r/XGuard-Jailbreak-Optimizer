import { Form, Input, Button, Card, Descriptions, Alert, Spin, Row, Col, Space, Badge, Progress, Statistic, Tag, Collapse } from 'antd';
import { SafetyOutlined, ScanOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { detectPrompt, analyzeReasoning } from '../api/client';

// 风险类别中文映射
const RISK_CATEGORY_MAP = {
  'Safe-Safe': '安全',
  'Crimes and Illegal Activities-Pornographic Contraband': '违法犯罪-色情违禁',
  'Crimes and Illegal Activities-Drug Crimes': '违法犯罪-毒品犯罪',
  'Crimes and Illegal Activities-Dangerous Weapons': '违法犯罪-危险武器',
  'Crimes and Illegal Activities-Property Infringement': '违法犯罪-财产侵权',
  'Crimes and Illegal Activities-Economic Crimes': '违法犯罪-经济犯罪',
  'Hate Speech-Abusive Curses': '仇恨言论-辱骂诅咒',
  'Hate Speech-Defamation': '仇恨言论-诽谤',
  'Hate Speech-Threats and Intimidation': '仇恨言论-威胁恐吓',
  'Hate Speech-Cyberbullying': '仇恨言论-网络欺凌',
  'Physical and Mental Health-Physical Health': '身心健康-身体健康',
  'Physical and Mental Health-Mental Health': '身心健康-心理健康',
  'Ethics and Morality-Social Ethics': '伦理道德-社会伦理',
  'Ethics and Morality-Science Ethics': '伦理道德-科学伦理',
  'Data Privacy-Personal Privacy': '数据隐私-个人隐私',
  'Data Privacy-Commercial Secret': '数据隐私-商业机密',
  'Cybersecurity-Access Control': '网络安全-访问控制',
  'Cybersecurity-Malicious Code': '网络安全-恶意代码',
  'Cybersecurity-Hacker Attack': '网络安全-黑客攻击',
  'Cybersecurity-Physical Security': '网络安全-物理安全',
  'Extremism-Violent Terrorist Activities': '极端主义-暴力恐怖',
  'Extremism-Social Disruption': '极端主义-社会破坏',
  'Extremism-Extremist Ideological Trends': '极端主义-极端思潮',
  'Inappropriate Suggestions-Finance': '不当建议-金融',
  'Inappropriate Suggestions-Medicine': '不当建议-医疗',
  'Inappropriate Suggestions-Law': '不当建议-法律',
  'Risks Involving Minors-Corruption of Minors': '涉及未成年人-侵蚀未成年人',
  'Risks Involving Minors-Minor Abuse and Exploitation': '涉及未成年人-虐待利用未成年人',
  'Risks Involving Minors-Minor Delinquency': '涉及未成年人-未成年人犯罪'
};

export default function DetectorPanel() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('prompt');
  const [auditTime, setAuditTime] = useState(0);

  const handleDetect = async (values) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const startTime = Date.now();

    try {
      let response;
      if (mode === 'prompt') {
        response = await detectPrompt(values.prompt);
      } else {
        response = await analyzeReasoning(values.prompt, values.response);
      }
      setResult(response);
      setAuditTime((Date.now() - startTime) / 1000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // 计算风险等级和主要风险
  const calculateRiskLevel = (riskScore) => {
    if (!riskScore) return null;
    
    // 找出最高风险项(排除Safe)
    let maxRisk = { category: 'Safe-Safe', score: 0, zhName: '安全' };
    Object.entries(riskScore).forEach(([key, value]) => {
      if (key !== 'Safe-Safe' && value > maxRisk.score) {
        maxRisk = {
          category: key,
          score: value,
          zhName: RISK_CATEGORY_MAP[key] || key
        };
      }
    });

    const safeScore = riskScore['Safe-Safe'] || 0;
    
    // 判断风险等级
    let level = '低风险';
    let color = 'success';
    if (maxRisk.score > 0.7) {
      level = '高风险';
      color = 'error';
    } else if (maxRisk.score > 0.4) {
      level = '中风险';
      color = 'warning';
    }

    return {
      level,
      color,
      mainRisk: maxRisk,
      safeScore
    };
  };

  const riskInfo = result ? calculateRiskLevel(result.risk_score) : null;

  return (
    <Row gutter={24}>
      {/* 左侧输入区 */}
      <Col xs={24} lg={10}>
        <Card 
          title={
            <Space>
              <ScanOutlined />
              <span>检测配置</span>
            </Space>
          }
          bordered={false}
        >
          <Space style={{ marginBottom: 16 }}>
            <Button
              type={mode === 'prompt' ? 'primary' : 'default'}
              onClick={() => setMode('prompt')}
            >
              Prompt检测
            </Button>
            <Button
              type={mode === 'response' ? 'primary' : 'default'}
              onClick={() => setMode('response')}
            >
              Response检测(含Reasoning)
            </Button>
          </Space>

          <div style={{ 
            fontSize: 12, 
            color: '#999', 
            marginBottom: 16,
            paddingLeft: 8,
            borderLeft: '3px solid #e8e8e8'
          }}>
            <span style={{ marginRight: 8 }}></span>
            检测能力支持: YuFeng-XGuard-Reason-0.6B
          </div>

          <Form form={form} onFinish={handleDetect} layout="vertical">
            <Form.Item
              name="prompt"
              label="待检测文本/Prompt"
              required
              rules={[{ required: true, message: '请输入文本' }]}
            >
              <Input.TextArea rows={6} placeholder="输入要检测的文本..." />
            </Form.Item>

            {mode === 'response' && (
              <Form.Item
                name="response"
                label="AI响应"
                required
                rules={[{ required: true, message: '请输入AI响应' }]}
              >
                <Input.TextArea rows={6} placeholder="输入AI的响应..." />
              </Form.Item>
            )}

            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
              icon={<SafetyOutlined />}
            >
              检测
            </Button>
          </Form>
        </Card>

        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            style={{ marginTop: 24 }}
            showIcon
          />
        )}
      </Col>

      {/* 右侧结果区 */}
      <Col xs={24} lg={14}>
        {loading && (
          <Card bordered={false}>
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
              <p style={{ marginTop: 16, color: '#999' }}>检测中...</p>
            </div>
          </Card>
        )}

        {result && !loading && riskInfo && (
          <div>
            {/* 审核结果总览 */}
            <Card 
              title={
                <Space>
                  <WarningOutlined />
                  <span>审核结果总览</span>
                </Space>
              }
              bordered={false}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={16}>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="风险等级"
                    value={riskInfo.level}
                    valueStyle={{ 
                      color: riskInfo.color === 'error' ? '#ff4d4f' : 
                             riskInfo.color === 'warning' ? '#faad14' : '#52c41a',
                      fontSize: 24
                    }}
                    prefix={
                      riskInfo.color === 'error' ? '🔴' :
                      riskInfo.color === 'warning' ? '🟡' : '🟢'
                    }
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="主要风险类别"
                    value={riskInfo.mainRisk.zhName}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="该风险概率"
                    value={riskInfo.mainRisk.score * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{ 
                      color: riskInfo.mainRisk.score > 0.7 ? '#ff4d4f' : 
                             riskInfo.mainRisk.score > 0.4 ? '#faad14' : '#52c41a'
                    }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="安全概率"
                    value={riskInfo.safeScore * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="审核耗时"
                    value={auditTime}
                    precision={2}
                    suffix="秒"
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Statistic
                    title="审核模式"
                    value={mode === 'prompt' ? 'Prompt' : 'Response'}
                  />
                </Col>
              </Row>
            </Card>

            {/* 各风险维度分数 */}
            <Card 
              title={
                <Space>
                  <SafetyOutlined />
                  <span>各风险维度分数</span>
                </Space>
              }
              bordered={false}
              style={{ marginBottom: 24 }}
            >
              {Object.entries(result.risk_score || {})
                .sort((a, b) => b[1] - a[1]) // 按分数降序
                .map(([key, value]) => {
                  const zhName = RISK_CATEGORY_MAP[key] || key;
                  const isSafe = key === 'Safe-Safe';
                  const isHighRisk = value > 0.7;
                  const isMediumRisk = value > 0.4 && value <= 0.7;
                  
                  let statusColor = '#52c41a'; // 低风险-绿色
                  let emoji = '🟢';
                  if (isHighRisk && !isSafe) {
                    statusColor = '#ff4d4f'; // 高风险-红色
                    emoji = '🔴';
                  } else if (isMediumRisk && !isSafe) {
                    statusColor = '#faad14'; // 中风险-黄色
                    emoji = '🟡';
                  }

                  return (
                    <div key={key} style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          <span style={{ marginRight: 8 }}>{emoji}</span>
                          <span>{zhName}</span>
                        </span>
                        <span style={{ fontWeight: 600, color: statusColor }}>
                          {(value * 100).toFixed(2)}%
                        </span>
                      </div>
                      <Progress 
                        percent={value * 100} 
                        strokeColor={statusColor}
                        showInfo={false}
                        size="small"
                      />
                    </div>
                  );
                })}
            </Card>

            {/* 模型原始输出 */}
            <Card 
              title={
                <Space>
                  <SafetyOutlined />
                  <span>模型原始输出</span>
                </Space>
              }
              bordered={false}
              style={{ marginBottom: 24 }}
            >
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="完整检测结果">
                  <Collapse ghost>
                    <Collapse.Panel header="点击展开查看完整JSON" key="1">
                      <pre style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        background: '#fafafa',
                        padding: 12,
                        borderRadius: 4,
                        fontSize: 12,
                        maxHeight: '400px',
                        overflow: 'auto',
                        fontFamily: 'monospace'
                      }}>
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </Collapse.Panel>
                  </Collapse>
                </Descriptions.Item>
                <Descriptions.Item label="模型响应Token">
                  <code style={{ 
                    background: '#f5f5f5', 
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontFamily: 'monospace'
                  }}>
                    {result.response}
                  </code>
                </Descriptions.Item>
                {result.explanation && (
                  <Descriptions.Item label="Reasoning解释">
                    <Collapse ghost>
                      <Collapse.Panel header="点击展开查看详细分析" key="2">
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            background: '#fafafa',
                            padding: 12,
                            borderRadius: 4,
                            maxHeight: '400px',
                            overflow: 'auto',
                            fontSize: 12
                          }}
                        >
                          {result.explanation}
                        </pre>
                      </Collapse.Panel>
                    </Collapse>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Token分数(可选) */}
            {result.token_score && Object.keys(result.token_score).length > 0 && (
              <Card 
                title="Token分数(Top 10)"
                bordered={false}
              >
                <Row gutter={[8, 8]}>
                  {Object.entries(result.token_score)
                    .slice(0, 10)
                    .map(([key, value]) => (
                      <Col xs={12} sm={8} md={6} key={key}>
                        <Card 
                          size="small" 
                          style={{ background: '#fafafa', textAlign: 'center' }}
                        >
                          <div style={{ 
                            fontSize: 11, 
                            color: '#666',
                            marginBottom: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {key}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>
                            {(value * 100).toFixed(1)}%
                          </div>
                        </Card>
                      </Col>
                    ))}
                </Row>
              </Card>
            )}
          </div>
        )}

        {!loading && !result && (
          <Card bordered={false}>
            <div style={{ 
              textAlign: 'center', 
              padding: '80px 20px',
              color: '#999'
            }}>
              <SafetyOutlined style={{ fontSize: 64, marginBottom: 24 }} />
              <p style={{ fontSize: 16 }}>输入文本后点击"检测"开始分析</p>
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}
