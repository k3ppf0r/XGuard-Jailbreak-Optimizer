"""
Pydantic数据模型定义
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class DetectRequest(BaseModel):
    """检测请求模型"""
    content: Optional[str] = Field(None, description="待检测的单个文本内容")
    prompt: Optional[str] = Field(None, description="用户提示词")
    response: Optional[str] = Field(None, description="AI响应")


class OptimizationRequest(BaseModel):
    """优化任务请求模型"""
    malicious_intent: str = Field(..., description="恶意意图/原始危险提示词")
    objective: str = Field(
        default="goal1",
        description="优化目标: goal1(response有害但prompt通过), goal2(双重通过), goal3(仅Prompt检测)"
    )
    api_key: str = Field(..., description="优化LLM的API密钥")
    model_name: str = Field(
        default="gpt-3.5-turbo",
        description="优化LLM模型名称"
    )
    base_url: Optional[str] = Field(None, description="API基础URL(可选)")
    downstream_api_key: Optional[str] = Field(None, description="下游模型API密钥(goal1/goal2需要)")
    downstream_model_name: Optional[str] = Field(None, description="下游模型名称")
    downstream_base_url: Optional[str] = Field(None, description="下游模型API基础URL(可选)")
    max_iterations: int = Field(default=20, description="最大迭代次数")
    candidates_per_iteration: int = Field(default=8, description="每轮测试的候选数量")


class DetectResponse(BaseModel):
    """检测响应模型"""
    response: str = Field(..., description="模型输出文本")
    token_score: Dict[str, float] = Field(..., description="Token级别分数")
    risk_score: Dict[str, float] = Field(..., description="风险类别分数")
    explanation: Optional[str] = Field(None, description="Reasoning解释(如果有)")


class ProgressUpdate(BaseModel):
    """优化进度更新模型"""
    iteration: int = Field(..., description="当前迭代次数")
    candidate_index: int = Field(..., description="候选索引")
    candidate: str = Field(..., description="候选提示词")
    llm_response: str = Field(..., description="LLM响应")
    prompt_safety: Dict[str, Any] = Field(..., description="Prompt安全检测结果")
    response_safety: Dict[str, Any] = Field(..., description="Response安全检测结果")
    reasoning: Dict[str, Any] = Field(..., description="Reasoning分析")
    score: float = Field(..., description="适应度得分")
    prompt_safe_score: float = Field(..., description="Prompt安全分数")
    response_safe_score: float = Field(..., description="Response安全分数")


class OptimizationResult(BaseModel):
    """优化结果模型"""
    success: bool = Field(..., description="是否成功")
    jailbreak_prompt: Optional[str] = Field(None, description="越狱提示词")
    iterations: int = Field(..., description="执行的迭代次数")
    final_response: Optional[str] = Field(None, description="最终LLM响应")
    prompt_safety: Optional[Dict[str, Any]] = Field(None, description="Prompt安全结果")
    response_safety: Optional[Dict[str, Any]] = Field(None, description="Response安全结果")
    reasoning: Optional[Dict[str, Any]] = Field(None, description="Reasoning分析")
    score: Optional[float] = Field(None, description="最终得分")
    message: Optional[str] = Field(None, description="失败时的消息")
    best_attempt: Optional[Dict[str, Any]] = Field(None, description="最佳尝试数据")
    best_score: Optional[float] = Field(None, description="最佳得分")


class ErrorResponse(BaseModel):
    """错误响应模型"""
    error: str = Field(..., description="错误类型")
    message: str = Field(..., description="错误消息")
    detail: Optional[str] = Field(None, description="详细信息")
