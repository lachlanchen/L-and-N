import type { PronunciationFeedback, PronunciationFeedbackCode, UILanguage } from './types'

export const uiLanguageLabels: Record<UILanguage, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  yue: '廣東話',
}

interface PrincipleCopy {
  title: string
  body: string
}

export interface UICopy {
  appTitle: string
  uiLanguage: string
  streak: string
  trainingLanguage: string
  primaryNavigation: string
  nav: { practice: string; learn: string; progress: string }
  practice: {
    session: string
    sessionHint: string
    previousWord: string
    nextWord: string
    soundPicker: string
    target: string
    measuredOnset: string
    onsetToneSeparate: string
    hearModel: string
    studioTitle: string
    letterMeasured: string
    onsetMeasured: string
    say: string
    not: string
    listening: string
    preparing: string
    analysing: string
    stopAndScore: string
    startRecording: string
    tapToScore: string
    tapThenSay: string
    scoreHow: string
    scoreHowBody: string
  }
  signal: {
    aria: string
    listeningLive: string
    lastSound: string
    soundLens: string
    onsetSpectrum: string
    note: string
  }
  learn: {
    eyebrow: string
    title: string
    loading: string
    principles: PrincipleCopy[]
    source: string
    sourceBody: string
    sourceLink: string
  }
  model: {
    interactive: string
    lateral: string
    nasal: string
    soundPicker: string
    ariaL: string
    ariaN: string
    tongue: string
    ridge: string
    velum: string
    airPath: string
    lContact: string
    lVelum: string
    lAir: string
    nContact: string
    nVelum: string
    nAir: string
    drag: string
    disclaimer: string
  }
  progress: {
    eyebrow: string
    title: string
    hint: string
    dayStreak: string
    average: string
    attempts: string
    recent: string
    empty: string
    start: string
    target: string
    detected: string
    note: string
    privacy: string
    support: string
  }
  score: {
    word: string
    contrast: string
    soundCues: string
    voice: string
    tone: string
    confidence: Record<'high' | 'medium' | 'low', string>
    landed: string
    close: string
    slowly: string
    detected: string
    uncertain: string
    evidence: string
    lLike: string
    nLike: string
    signal: string
    nasalBand: string
    evidenceDetail: string
    retry: string
    next: string
  }
  feedback: Record<PronunciationFeedbackCode, string>
  errors: { microphone: string; recording: string; silence: string; scoring: string }
}

const copies: Record<UILanguage, UICopy> = {
  en: {
    appTitle: 'L-and-N pronunciation coach',
    uiLanguage: 'Interface language',
    streak: 'Practice streak',
    trainingLanguage: 'Practice language',
    primaryNavigation: 'Primary navigation',
    nav: { practice: 'Practice', learn: 'Learn', progress: 'Progress' },
    practice: {
      session: '4-minute sound drill',
      sessionHint: 'Listen · feel · record',
      previousWord: 'Previous word',
      nextWord: 'Next word',
      soundPicker: 'Choose the sound to practise',
      target: 'TARGET',
      measuredOnset: 'measured onset',
      onsetToneSeparate: 'onset · tone separate',
      hearModel: 'Hear studio model',
      studioTitle: 'Verified offline studio example',
      letterMeasured: 'The first letter {value} is the measured sound',
      onsetMeasured: 'The {value} onset in the romanization is measured',
      say: 'Say',
      not: 'Not',
      listening: 'Listening',
      preparing: 'Preparing microphone…',
      analysing: 'Analysing…',
      stopAndScore: 'Stop and score recording',
      startRecording: 'Start recording',
      tapToScore: 'Tap to score',
      tapThenSay: 'Tap, then say it',
      scoreHow: 'How this score works',
      scoreHowBody: 'Word recognition + minimal-pair contrast + nasal/lateral acoustic cues + delivery stability. Recognition uses the device or browser when available. A browser without compatible recognition may use L & N’s private Whisper service; the recording is discarded after transcription.',
    },
    signal: {
      aria: 'Live waveform and onset spectrum',
      listeningLive: 'Listening live',
      lastSound: 'Last sound',
      soundLens: 'Sound lens',
      onsetSpectrum: 'onset · spectrum',
      note: 'The shaded opening is where L/N evidence is measured. Wave height shows signal, not correctness.',
    },
    learn: {
      eyebrow: 'The 60-second science',
      title: 'One contact. Two air paths.',
      loading: 'Preparing the mouth model…',
      principles: [
        { title: 'Shared place, different seal', body: 'Both sounds use tongue-tip or tongue-blade contact at or near the alveolar ridge. /l/ keeps side channels open; /n/ makes a broad oral seal.' },
        { title: 'L is lateral', body: 'For initial light /l/, the velum is raised and air flows around one or both sides of the tongue. Keep nasal vibration quiet.' },
        { title: 'N is nasal', body: 'For /n/, the tongue closes the oral path while the velum lowers, opening the route into the nasal cavity.' },
        { title: 'Train perception before speed', body: 'Listen, identify, produce, then use the contrast in short phrases. Accuracy comes before conversational speed.' },
      ],
      source: 'Lesson source',
      sourceBody: 'Built from the linked Pronunciation Snippets lesson, then extended with Mandarin and Cantonese minimal-pair practice.',
      sourceLink: 'Watch “The Difference Between L & N”',
    },
    model: {
      interactive: 'Interactive teaching model',
      lateral: 'Lateral airflow /l/',
      nasal: 'Nasal airflow /n/',
      soundPicker: 'Choose model sound',
      ariaL: 'Rotatable teaching model of lateral L articulation',
      ariaN: 'Rotatable teaching model of nasal N articulation',
      tongue: 'tongue',
      ridge: 'alveolar ridge',
      velum: 'velum',
      airPath: 'air path',
      lContact: 'Narrow tip contact',
      lVelum: 'Velum raised',
      lAir: 'Air escapes at the sides',
      nContact: 'Broad tongue seal',
      nVelum: 'Velum lowered',
      nAir: 'Air exits through the nose',
      drag: 'Drag for an oblique view.',
      disclaimer: 'This is an explanatory target model—not a scan or measurement of your tongue.',
    },
    progress: {
      eyebrow: 'Private on this device', title: 'Your sound map', hint: 'Short, frequent practice beats one long session.',
      dayStreak: 'day streak', average: 'average score', attempts: 'attempts', recent: 'Recent attempts',
      empty: 'Your first recording will appear here.', start: 'Start a drill', target: 'target', detected: 'detected',
      note: 'Scores are coaching feedback, not diagnosis. For clinical use, validate them with a speech-language professional.', privacy: 'Privacy', support: 'Support',
    },
    score: {
      word: 'Word', contrast: 'L/N contrast', soundCues: 'Sound cues', voice: 'Voice', tone: 'Tone',
      confidence: { high: 'high confidence', medium: 'medium confidence', low: 'low confidence' },
      landed: 'That contrast landed.', close: 'Close—shape the first sound.', slowly: 'Build the sound slowly.', detected: 'Detected', uncertain: 'uncertain',
      evidence: 'See the sound evidence', lLike: 'L-like', nLike: 'N-like', signal: 'Signal', nasalBand: 'Nasal band',
      evidenceDetail: 'A1–P0 proxy {nasal} dB · formant spacing ≈ {formant} Hz · tilt {tilt} dB. Microphone estimates—not tongue tracking.',
      retry: 'Try again', next: 'Next word',
    },
    feedback: {
      recognitionUnavailable: 'Word recognition was unavailable, so the score relies on the recorded onset and carries lower confidence.',
      recognitionUnclear: 'The recognizer heard “{value}”. Slow down and make the first sound clear before the vowel.',
      recognitionClear: 'The word identity was clear: “{value}”.',
      addNasal: 'Add a brief nasal murmur at the start. Touch your nose lightly and check for vibration.',
      reduceNasal: 'Reduce nasal resonance. Keep the tongue tip up and release air around its sides.',
      acousticSupports: 'The acoustic pattern supports /{value}/.',
      signalLimited: 'Signal quality was limited; move closer, reduce background noise, and avoid clipping.',
      holdLonger: 'Hold the word slightly longer so the contrast can be measured reliably.',
      toneShape: 'Onset and tone are scored separately. Repeat tone {value} with a steadier pitch shape.',
      personalized: 'Your on-device acoustic baseline contributed to this comparison.',
    },
    errors: {
      microphone: 'Microphone access is required to practise. Speech recognition improves the score when available.',
      recording: 'No usable audio was captured. Check the microphone, then try again.',
      silence: 'I could not hear a clear word. Move closer to the microphone and try again.',
      scoring: 'The recording could not be scored. Please try again.',
    },
  },
  'zh-Hans': {
    appTitle: 'L-and-N 发音教练', uiLanguage: '界面语言', streak: '连续练习', trainingLanguage: '练习语言', primaryNavigation: '主导航',
    nav: { practice: '练习', learn: '学习', progress: '进度' },
    practice: {
      session: '4 分钟辨音练习', sessionHint: '听 · 感受 · 录音', previousWord: '上一个词', nextWord: '下一个词', soundPicker: '选择要练习的音',
      target: '目标', measuredOnset: '分析词首音', onsetToneSeparate: '词首音 · 声调分开评分', hearModel: '听标准示范', say: '请说', not: '不要说成',
      studioTitle: '已验证的离线标准示范', letterMeasured: '分析首字母 {value} 的发音', onsetMeasured: '分析拼音中的 {value} 词首音',
      listening: '正在聆听', preparing: '正在准备麦克风…', analysing: '分析中…', stopAndScore: '停止录音并评分', startRecording: '开始录音', tapToScore: '点按并评分', tapThenSay: '点按后说出词语',
      scoreHow: '评分方法', scoreHowBody: '综合辨词、最小对立词、鼻音/边音声学线索和发声稳定性。可用时由设备或浏览器辨词；浏览器不支持兼容识别时，可能使用 L & N 的私有 Whisper 服务，转写后即丢弃录音。',
    },
    signal: { aria: '实时波形与词首频谱', listeningLive: '实时聆听', lastSound: '上次录音', soundLens: '声音镜头', onsetSpectrum: '词首 · 频谱', note: '阴影区域是提取 L/N 线索的位置。波形高度表示信号强弱，不表示发音正确度。' },
    learn: {
      eyebrow: '60 秒发音原理', title: '同一接触点，两条气流通道', loading: '正在准备口腔模型…',
      principles: [
        { title: '位置相近，封闭方式不同', body: '两个音都在上齿龈附近用舌尖或舌叶接触。/l/ 保留舌侧通道，/n/ 形成较宽的口腔封闭。' },
        { title: 'L 是边音', body: '发词首清晰 /l/ 时，软腭抬起，气流从舌头一侧或两侧通过，鼻腔振动应尽量少。' },
        { title: 'N 是鼻音', body: '发 /n/ 时舌头封住口腔通道，软腭下降，气流改从鼻腔通过。' },
        { title: '先辨清，再加速', body: '先听辨、再发音，最后放进短语。清晰准确以后再提高会话速度。' },
      ],
      source: '课程来源', sourceBody: '以 Pronunciation Snippets 视频课程为基础，并扩展了普通话和粤语最小对立词练习。', sourceLink: '观看《L 与 N 的区别》',
    },
    model: {
      interactive: '交互式教学模型', lateral: '边音气流 /l/', nasal: '鼻音气流 /n/', soundPicker: '选择模型发音', ariaL: '可旋转的 L 边音发音教学模型', ariaN: '可旋转的 N 鼻音发音教学模型',
      tongue: '舌头', ridge: '上齿龈', velum: '软腭', airPath: '气流', lContact: '较窄的舌尖接触', lVelum: '软腭抬起', lAir: '气流从舌侧通过', nContact: '较宽的舌面封闭', nVelum: '软腭下降', nAir: '气流从鼻腔通过',
      drag: '拖动可查看斜侧面。', disclaimer: '这是用于解释目标动作的模型，不是对您舌头的扫描或测量。',
    },
    progress: { eyebrow: '仅保存在本设备', title: '你的发音地图', hint: '短时、频繁的练习胜过一次练很久。', dayStreak: '连续天数', average: '平均分', attempts: '练习次数', recent: '最近练习', empty: '第一次录音会显示在这里。', start: '开始练习', target: '目标', detected: '检测为', note: '分数只用于发音辅导，不是医学诊断。如用于临床，请与言语治疗专业人员共同验证。', privacy: '隐私政策', support: '帮助与支持' },
    score: {
      word: '辨词', contrast: 'L/N 对立', soundCues: '声音线索', voice: '发声', tone: '声调', confidence: { high: '高置信度', medium: '中等置信度', low: '低置信度' },
      landed: '这次对立发得很清楚。', close: '很接近——再塑造词首音。', slowly: '先慢慢建立这个音。', detected: '检测结果', uncertain: '不确定', evidence: '查看声音证据', lLike: '更像 L', nLike: '更像 N', signal: '信号', nasalBand: '鼻音频带',
      evidenceDetail: 'A1–P0 近似值 {nasal} dB · 共振峰间距约 {formant} Hz · 频谱倾斜 {tilt} dB。这些是麦克风估计，不是舌位追踪。', retry: '再试一次', next: '下一个词',
    },
    feedback: {
      recognitionUnavailable: '本次无法辨词，因此分数主要依据录音词首音，置信度较低。', recognitionUnclear: '识别器听到“{value}”。请放慢速度，在元音前把第一个音发清楚。', recognitionClear: '词语辨识清楚：“{value}”。',
      addNasal: '词首增加短暂鼻腔共鸣。轻触鼻翼，检查是否有振动。', reduceNasal: '减少鼻腔共鸣。舌尖保持抬起，让气流从舌头两侧通过。', acousticSupports: '声学模式支持 /{value}/。',
      signalLimited: '信号质量有限；请靠近麦克风、减少背景噪声并避免爆音。', holdLonger: '把词稍微说长一点，才能更可靠地分析对立。', toneShape: '词首音和声调分开评分。请用更稳定的音高轮廓重复第 {value} 声。', personalized: '本次比较使用了保存在本设备上的个人声学基线。',
    },
    errors: {
      microphone: '练习需要麦克风权限；语音识别可用时会提高评分质量。',
      recording: '没有录到可用的声音。请检查麦克风后重试。',
      silence: '没有听到清楚的词语。请靠近麦克风再试一次。',
      scoring: '本次录音无法评分，请再试一次。',
    },
  },
  'zh-Hant': {
    appTitle: 'L-and-N 發音教練', uiLanguage: '介面語言', streak: '連續練習', trainingLanguage: '練習語言', primaryNavigation: '主要導覽',
    nav: { practice: '練習', learn: '學習', progress: '進度' },
    practice: {
      session: '4 分鐘辨音練習', sessionHint: '聽 · 感受 · 錄音', previousWord: '上一個詞', nextWord: '下一個詞', soundPicker: '選擇要練習的音',
      target: '目標', measuredOnset: '分析詞首音', onsetToneSeparate: '詞首音 · 聲調分開評分', hearModel: '聽標準示範', say: '請說', not: '不要說成',
      studioTitle: '已驗證的離線標準示範', letterMeasured: '分析首字母 {value} 的發音', onsetMeasured: '分析羅馬字中的 {value} 詞首音',
      listening: '正在聆聽', preparing: '正在準備咪高峰…', analysing: '分析中…', stopAndScore: '停止錄音並評分', startRecording: '開始錄音', tapToScore: '點按並評分', tapThenSay: '點按後說出詞語',
      scoreHow: '評分方法', scoreHowBody: '綜合辨詞、最小對立詞、鼻音／邊音聲學線索和發聲穩定性。可用時由裝置或瀏覽器辨詞；瀏覽器不支援兼容辨識時，可能使用 L & N 的私有 Whisper 服務，轉寫後即棄置錄音。',
    },
    signal: { aria: '即時波形與詞首頻譜', listeningLive: '即時聆聽', lastSound: '上次錄音', soundLens: '聲音鏡頭', onsetSpectrum: '詞首 · 頻譜', note: '陰影區域是提取 L/N 線索的位置。波形高度代表訊號強弱，不代表發音正確度。' },
    learn: {
      eyebrow: '60 秒發音原理', title: '同一接觸點，兩條氣流通道', loading: '正在準備口腔模型…',
      principles: [
        { title: '位置相近，封閉方式不同', body: '兩個音都在上齒齦附近用舌尖或舌葉接觸。/l/ 保留舌側通道，/n/ 形成較寬的口腔封閉。' },
        { title: 'L 是邊音', body: '發詞首清晰 /l/ 時，軟顎抬起，氣流從舌頭一側或兩側通過，鼻腔振動應盡量少。' },
        { title: 'N 是鼻音', body: '發 /n/ 時舌頭封住口腔通道，軟顎下降，氣流改從鼻腔通過。' },
        { title: '先辨清，再加速', body: '先聽辨、再發音，最後放進短語。清晰準確以後再提高會話速度。' },
      ],
      source: '課程來源', sourceBody: '以 Pronunciation Snippets 影片課程為基礎，並延伸普通話和廣東話最小對立詞練習。', sourceLink: '觀看《L 與 N 的分別》',
    },
    model: {
      interactive: '互動教學模型', lateral: '邊音氣流 /l/', nasal: '鼻音氣流 /n/', soundPicker: '選擇模型發音', ariaL: '可旋轉的 L 邊音發音教學模型', ariaN: '可旋轉的 N 鼻音發音教學模型',
      tongue: '舌頭', ridge: '上齒齦', velum: '軟顎', airPath: '氣流', lContact: '較窄的舌尖接觸', lVelum: '軟顎抬起', lAir: '氣流從舌側通過', nContact: '較寬的舌面封閉', nVelum: '軟顎下降', nAir: '氣流從鼻腔通過',
      drag: '拖動可查看斜側面。', disclaimer: '這是用來解釋目標動作的模型，並非對你的舌頭進行掃描或測量。',
    },
    progress: { eyebrow: '只保存在本裝置', title: '你的發音地圖', hint: '短時間、頻密的練習勝過一次練很久。', dayStreak: '連續日數', average: '平均分', attempts: '練習次數', recent: '最近練習', empty: '第一次錄音會顯示在這裡。', start: '開始練習', target: '目標', detected: '偵測為', note: '分數只用於發音輔導，並非醫學診斷。如用於臨床，請與言語治療專業人員共同驗證。', privacy: '私隱政策', support: '幫助與支援' },
    score: {
      word: '辨詞', contrast: 'L/N 對立', soundCues: '聲音線索', voice: '發聲', tone: '聲調', confidence: { high: '高可信度', medium: '中等可信度', low: '低可信度' },
      landed: '這次對立發得很清楚。', close: '很接近——再調整詞首音。', slowly: '先慢慢建立這個音。', detected: '偵測結果', uncertain: '不確定', evidence: '查看聲音證據', lLike: '較像 L', nLike: '較像 N', signal: '訊號', nasalBand: '鼻音頻帶',
      evidenceDetail: 'A1–P0 近似值 {nasal} dB · 共振峰間距約 {formant} Hz · 頻譜傾斜 {tilt} dB。這些是咪高峰估計，不是舌位追蹤。', retry: '再試一次', next: '下一個詞',
    },
    feedback: {
      recognitionUnavailable: '本次無法辨詞，因此分數主要依據錄音詞首音，可信度較低。', recognitionUnclear: '辨識器聽到「{value}」。請放慢速度，在元音前把第一個音發清楚。', recognitionClear: '詞語辨識清楚：「{value}」。',
      addNasal: '詞首增加短暫鼻腔共鳴。輕觸鼻翼，檢查是否有振動。', reduceNasal: '減少鼻腔共鳴。舌尖保持抬起，讓氣流從舌頭兩側通過。', acousticSupports: '聲學模式支持 /{value}/。',
      signalLimited: '訊號質素有限；請靠近咪高峰、減少背景噪音並避免爆音。', holdLonger: '把詞稍微說長一點，才能更可靠地分析對立。', toneShape: '詞首音和聲調分開評分。請用更穩定的音高輪廓重複第 {value} 聲。', personalized: '本次比較使用了保存在本裝置上的個人聲學基線。',
    },
    errors: {
      microphone: '練習需要咪高峰權限；語音辨識可用時會提高評分質素。',
      recording: '沒有錄到可用的聲音。請檢查咪高峰後再試。',
      silence: '沒有聽到清楚的詞語。請靠近咪高峰再試一次。',
      scoring: '本次錄音無法評分，請再試一次。',
    },
  },
  yue: {
    appTitle: 'L-and-N 發音教練', uiLanguage: '介面語言', streak: '連續練習', trainingLanguage: '練習語言', primaryNavigation: '主要導覽',
    nav: { practice: '練習', learn: '學原理', progress: '進度' },
    practice: {
      session: '4 分鐘辨音練習', sessionHint: '聽 · 感受 · 錄低', previousWord: '上一個詞', nextWord: '下一個詞', soundPicker: '揀想練嘅音',
      target: '目標', measuredOnset: '分析詞首音', onsetToneSeparate: '詞首音 · 聲調分開計', hearModel: '聽標準示範', say: '講', not: '唔好講成',
      studioTitle: '驗證過嘅離線標準示範', letterMeasured: '分析第一個字母 {value} 嘅發音', onsetMeasured: '分析羅馬字入面嘅 {value} 詞首音',
      listening: '聽緊', preparing: '準備緊咪高峰…', analysing: '分析緊…', stopAndScore: '停低錄音並評分', startRecording: '開始錄音', tapToScore: '撳一下評分', tapThenSay: '撳一下，再講個詞',
      scoreHow: '點樣評分', scoreHowBody: '綜合辨詞、最小對立詞、鼻音／邊音聲學線索同發聲穩定性。有得用時由裝置或瀏覽器辨詞；瀏覽器冇兼容辨識時，可能會用 L & N 私有 Whisper 服務，轉寫完就丟棄錄音。',
    },
    signal: { aria: '即時波形同詞首頻譜', listeningLive: '即時聽緊', lastSound: '上次錄音', soundLens: '聲音鏡頭', onsetSpectrum: '詞首 · 頻譜', note: '陰影位置係提取 L/N 線索嘅範圍。波形高度只代表訊號強弱，唔代表啱唔啱。' },
    learn: {
      eyebrow: '60 秒發音原理', title: '同一接觸點，兩條氣流通道', loading: '準備緊口腔模型…',
      principles: [
        { title: '位置接近，封口方式唔同', body: '兩個音都用舌尖或舌葉掂住上齒齦附近。/l/ 兩邊留通道，/n/ 就要封闊啲。' },
        { title: 'L 係邊音', body: '講詞首清晰 /l/ 時，軟顎升起，空氣由舌頭一邊或兩邊走，個鼻應該少震。' },
        { title: 'N 係鼻音', body: '講 /n/ 時舌頭封住口腔通道，軟顎降低，空氣改由鼻腔通過。' },
        { title: '先分得清，再講快', body: '先聽、再認、再講，之後先放入短句。清楚準確咗先加快。' },
      ],
      source: '課程來源', sourceBody: '根據 Pronunciation Snippets 影片課程，再加普通話同廣東話最小對立詞練習。', sourceLink: '睇《L 同 N 嘅分別》',
    },
    model: {
      interactive: '互動教學模型', lateral: '邊音氣流 /l/', nasal: '鼻音氣流 /n/', soundPicker: '揀模型發音', ariaL: '可以旋轉嘅 L 邊音發音教學模型', ariaN: '可以旋轉嘅 N 鼻音發音教學模型',
      tongue: '舌頭', ridge: '上齒齦', velum: '軟顎', airPath: '氣流', lContact: '較窄嘅舌尖接觸', lVelum: '軟顎升起', lAir: '氣流由舌側通過', nContact: '較闊嘅舌面封閉', nVelum: '軟顎降低', nAir: '氣流由鼻腔通過',
      drag: '拖動可以睇斜側面。', disclaimer: '呢個係解釋目標動作嘅模型，唔係掃描或者量度你條脷。',
    },
    progress: { eyebrow: '只保存在呢部機', title: '你嘅發音地圖', hint: '短時間、密啲練，好過一次練好耐。', dayStreak: '連續日數', average: '平均分', attempts: '練習次數', recent: '最近練習', empty: '第一次錄音會喺度出現。', start: '開始練習', target: '目標', detected: '聽落似', note: '分數只係發音輔導，唔係醫學診斷。如果用作臨床用途，請搵言語治療師一齊驗證。', privacy: '私隱政策', support: '幫助同支援' },
    score: {
      word: '辨詞', contrast: 'L/N 對立', soundCues: '聲音線索', voice: '發聲', tone: '聲調', confidence: { high: '高可信度', medium: '中等可信度', low: '低可信度' },
      landed: '今次對立講得好清楚。', close: '好接近——再執一執詞首音。', slowly: '慢慢建立呢個音先。', detected: '偵測結果', uncertain: '未肯定', evidence: '睇聲音證據', lLike: '較似 L', nLike: '較似 N', signal: '訊號', nasalBand: '鼻音頻帶',
      evidenceDetail: 'A1–P0 近似值 {nasal} dB · 共振峰間距約 {formant} Hz · 頻譜傾斜 {tilt} dB。呢啲係咪高峰估計，唔係追蹤舌位。', retry: '再試一次', next: '下一個詞',
    },
    feedback: {
      recognitionUnavailable: '今次辨唔到詞，所以分數主要根據錄音詞首音，可信度會低啲。', recognitionUnclear: '辨識器聽到「{value}」。講慢啲，喺元音之前講清楚第一個音。', recognitionClear: '詞語辨識清楚：「{value}」。',
      addNasal: '詞首加少少鼻腔共鳴。輕掂鼻翼，睇吓有冇震。', reduceNasal: '減少鼻腔共鳴。舌尖保持升起，等氣流由舌頭兩邊走。', acousticSupports: '聲學模式支持 /{value}/。',
      signalLimited: '訊號質素有限；行近咪高峰、減少背景聲，同埋避免爆音。', holdLonger: '個詞講長少少，先可以更可靠咁分析對立。', toneShape: '詞首音同聲調分開計。用穩定啲嘅音高走勢再講第 {value} 聲。', personalized: '今次比較用咗儲喺呢部機嘅個人聲學基線。',
    },
    errors: {
      microphone: '練習需要咪高峰權限；有語音辨識時會令評分更準。',
      recording: '今次錄唔到可用聲音。檢查咪高峰之後再試。',
      silence: '聽唔到清楚嘅詞。行近咪高峰再試一次。',
      scoring: '今次錄音評唔到分，請再試一次。',
    },
  },
}

export function initialUILanguage(): UILanguage {
  const saved = window.localStorage.getItem('landn.ui-language')
  if (saved && saved in copies) return saved as UILanguage
  const locale = navigator.language.toLowerCase()
  if (locale.startsWith('yue')) return 'yue'
  if (locale.includes('hant') || locale.includes('hk') || locale.includes('tw')) return 'zh-Hant'
  if (locale.startsWith('zh')) return 'zh-Hans'
  return 'en'
}

export function uiCopy(language: UILanguage): UICopy {
  return copies[language]
}

export function formatCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '—'))
}

export function feedbackCopy(copy: UICopy, feedback: PronunciationFeedback): string {
  return formatCopy(copy.feedback[feedback.code], { value: feedback.value ?? '—' })
}
