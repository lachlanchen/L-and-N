import type { Exercise, UILanguage } from '../types'

export interface ExerciseCopy {
  /** Coaching cue shown under the word, in the interface language. */
  cue: string
  /** Short gloss of the word's meaning, in the interface language. */
  gloss: string
}

/**
 * Interface-language copy for each exercise. The curriculum keeps the source
 * cue in the practice language; this table supplies the same cue and a gloss
 * in whichever interface language the learner chose, so a Chinese interface
 * never shows English coaching text and an English interface never shows a
 * Chinese-only gloss.
 */
export const exerciseCopy: Record<UILanguage, Record<string, ExerciseCopy>> = {
  en: {
    'en-light-night': { cue: 'Make the tongue tip narrow and place it forward, near the back of the upper front teeth. Let air escape around its sides.', gloss: 'brightness; not heavy' },
    'en-night-light': { cue: 'Widen the tongue tip against the bony ridge so the mouth is sealed, then let the voiced air resonate through your nose.', gloss: 'the dark hours' },
    'en-low-no': { cue: 'Keep the tongue tip narrow and forward; feel air escaping at the sides before the vowel begins.', gloss: 'not high' },
    'en-no-low': { cue: 'Hum the beginning for a fraction of a second. A finger on the side of the nose should feel vibration.', gloss: 'a refusal; not any' },
    'en-need-lead': { cue: 'Start with nasal resonance, then release directly into the long vowel.', gloss: 'to require' },
    'en-lead-need': { cue: 'Block the centre with the tongue tip and let the air flow laterally, without a nasal hum.', gloss: 'to guide' },
    'en-lever-never': { cue: 'Use a narrow, forward tongue tip for the light L; keep the start non-nasal.', gloss: 'a bar for lifting' },
    'en-never-lever': { cue: 'Seal the mouth with a wider tongue contact and begin with nasal vibration.', gloss: 'at no time' },
    'en-lock-knock': { cue: 'Release the voiced air around the tongue sides before opening into the vowel.', gloss: 'a fastening for a door' },
    'en-knock-lock': { cue: 'Start with a short nasal murmur; the written k is silent.', gloss: 'to tap on a door' },
    'en-lame-name': { cue: 'Keep the nose quiet while air slips around the narrower tongue tip.', gloss: 'unable to walk well' },
    'en-name-lame': { cue: 'Feel nasal vibration before the vowel, then keep the final /m/ distinct.', gloss: 'what someone is called' },
    'en-lace-nice': { cue: 'Make a clean lateral release, then move smoothly into /eɪ/.', gloss: 'delicate fabric; a shoe string' },
    'en-nice-lace': { cue: 'Begin with a wide oral seal and a brief, voiced nasal onset.', gloss: 'pleasant' },
    'en-lumber-number': { cue: 'Contrast the non-nasal light L with the later /m/; only the middle should hum.', gloss: 'cut timber' },
    'en-number-lumber': { cue: 'Make nasal resonance immediately at the start and again at /m/.', gloss: 'a numeral' },
    'en-loon-noon': { cue: 'Begin laterally, then finish with a separate nasal /n/.', gloss: 'a diving water bird' },
    'en-noon-loon': { cue: 'Use nasal resonance at both ends and keep the long vowel steady.', gloss: 'midday' },
    'en-lip-nip': { cue: 'Touch forward with a narrow tongue tip and release air at the sides.', gloss: 'edge of the mouth' },
    'en-nip-lip': { cue: 'Widen the tongue contact, seal the mouth, and start through the nose.', gloss: 'a small bite or pinch' },
    'zh-lan-nan': { cue: 'Touch the tongue tip lightly to the ridge and let air out around both sides; do not hum first. The tone is the rising second tone.', gloss: 'blue' },
    'zh-nan-lan': { cue: 'The tongue sits in almost the same place, but the air must leave through the nose. A finger on the nose should feel vibration. Second tone.', gloss: 'south' },
    'zh-lao-nao': { cue: 'Make a clear lateral /l/ first, then complete the dipping third tone; do not let the start turn nasal.', gloss: 'old' },
    'zh-nao-lao': { cue: 'Keep a very short nasal resonance before the vowel while holding the third-tone contour.', gloss: 'brain' },
    'yue-nei-lei': { cue: 'Place the tongue tip near the ridge, feel the nose vibrate first, then release into the vowel. Hong Kong speech often merges n/l; this drill keeps the contrast for clarity.', gloss: 'you' },
    'yue-lei-nei': { cue: 'Touch the ridge with the tongue tip, block the centre, and release air at both sides; avoid nasal vibration at the start.', gloss: 'reason; to manage' },
  },
  'zh-Hans': {
    'en-light-night': { cue: '舌尖收窄并放到前面，靠近上门牙后方，让气流从舌头两侧出来。', gloss: '光；轻的' },
    'en-night-light': { cue: '舌尖变宽并贴住上齿龈，把口腔封住，让浊音气流经过鼻腔共鸣。', gloss: '夜晚' },
    'en-low-no': { cue: '舌尖保持窄而靠前；在元音开始前先感受气流从舌侧流出。', gloss: '低的' },
    'en-no-low': { cue: '开头先哼一瞬间。手指放在鼻侧应能感到振动。', gloss: '不；没有' },
    'en-need-lead': { cue: '先带鼻腔共鸣，再直接放开到长元音。', gloss: '需要' },
    'en-lead-need': { cue: '用舌尖挡住中央，让气流从两侧流出，不要带鼻音。', gloss: '带领' },
    'en-lever-never': { cue: '用窄而靠前的舌尖发清晰的 L；开头不要带鼻音。', gloss: '杠杆' },
    'en-never-lever': { cue: '用较宽的舌面封住口腔，从鼻腔振动开始。', gloss: '从不' },
    'en-lock-knock': { cue: '先让浊音气流从舌头两侧释放，再打开到元音。', gloss: '锁' },
    'en-knock-lock': { cue: '以短促的鼻音开头；拼写中的 k 不发音。', gloss: '敲' },
    'en-lame-name': { cue: '鼻腔保持安静，让气流从较窄的舌尖两侧滑出。', gloss: '跛的' },
    'en-name-lame': { cue: '在元音前先感受鼻腔振动，结尾的 /m/ 也要清楚。', gloss: '名字' },
    'en-lace-nice': { cue: '干净地从舌侧释放，再平滑地进入 /eɪ/。', gloss: '蕾丝；鞋带' },
    'en-nice-lace': { cue: '先用较宽的口腔封闭，配合短促的浊鼻音开头。', gloss: '好的' },
    'en-lumber-number': { cue: '把不带鼻音的清晰 L 和后面的 /m/ 区分开；只有中间才该有鼻音。', gloss: '木材' },
    'en-number-lumber': { cue: '一开始就带鼻腔共鸣，到 /m/ 时再来一次。', gloss: '数字' },
    'en-loon-noon': { cue: '以边音开头，再用单独的鼻音 /n/ 收尾。', gloss: '潜鸟' },
    'en-noon-loon': { cue: '首尾都带鼻腔共鸣，长元音保持平稳。', gloss: '中午' },
    'en-lip-nip': { cue: '用窄舌尖向前接触，让气流从两侧释放。', gloss: '嘴唇' },
    'en-nip-lip': { cue: '舌面接触变宽、封住口腔，从鼻腔开始发声。', gloss: '轻咬' },
    'zh-lan-nan': { cue: '舌尖轻触上齿龈，气流从舌头两侧出来；不要先哼鼻音。声调是第二声。', gloss: '颜色：蓝色' },
    'zh-nan-lan': { cue: '舌尖位置相近，但气流要从鼻腔出来。轻按鼻翼，应感到振动。声调是第二声。', gloss: '方向：南方' },
    'zh-lao-nao': { cue: '先做清楚的边音 /l/，再完成第三声；不要让开头变成鼻音。', gloss: '年纪大' },
    'zh-nao-lao': { cue: '在元音前保留很短的鼻腔共鸣，同时保持第三声轮廓。', gloss: '大脑' },
    'yue-nei-lei': { cue: '舌尖贴近上齿龈，先感受鼻翼振动，再放开到元音。香港口语常有 n/l 合流，本练习保留对立作清晰度训练。', gloss: '第二人称“你”' },
    'yue-lei-nei': { cue: '舌尖接触上齿龈，中央受阻但两侧放气；避免鼻腔先振动。', gloss: '道理；管理' },
  },
  'zh-Hant': {
    'en-light-night': { cue: '舌尖收窄並放到前面，靠近上門牙後方，讓氣流從舌頭兩側出來。', gloss: '光；輕的' },
    'en-night-light': { cue: '舌尖變寬並貼住上齒齦，把口腔封住，讓濁音氣流經過鼻腔共鳴。', gloss: '夜晚' },
    'en-low-no': { cue: '舌尖保持窄而靠前；在元音開始前先感受氣流從舌側流出。', gloss: '低的' },
    'en-no-low': { cue: '開頭先哼一瞬間。手指放在鼻側應能感到震動。', gloss: '不；沒有' },
    'en-need-lead': { cue: '先帶鼻腔共鳴，再直接放開到長元音。', gloss: '需要' },
    'en-lead-need': { cue: '用舌尖擋住中央，讓氣流從兩側流出，不要帶鼻音。', gloss: '帶領' },
    'en-lever-never': { cue: '用窄而靠前的舌尖發清晰的 L；開頭不要帶鼻音。', gloss: '槓桿' },
    'en-never-lever': { cue: '用較寬的舌面封住口腔，從鼻腔震動開始。', gloss: '從不' },
    'en-lock-knock': { cue: '先讓濁音氣流從舌頭兩側釋放，再打開到元音。', gloss: '鎖' },
    'en-knock-lock': { cue: '以短促的鼻音開頭；拼寫中的 k 不發音。', gloss: '敲' },
    'en-lame-name': { cue: '鼻腔保持安靜，讓氣流從較窄的舌尖兩側滑出。', gloss: '跛的' },
    'en-name-lame': { cue: '在元音前先感受鼻腔震動，結尾的 /m/ 也要清楚。', gloss: '名字' },
    'en-lace-nice': { cue: '乾淨地從舌側釋放，再平滑地進入 /eɪ/。', gloss: '蕾絲；鞋帶' },
    'en-nice-lace': { cue: '先用較寬的口腔封閉，配合短促的濁鼻音開頭。', gloss: '好的' },
    'en-lumber-number': { cue: '把不帶鼻音的清晰 L 和後面的 /m/ 區分開；只有中間才該有鼻音。', gloss: '木材' },
    'en-number-lumber': { cue: '一開始就帶鼻腔共鳴，到 /m/ 時再來一次。', gloss: '數字' },
    'en-loon-noon': { cue: '以邊音開頭，再用單獨的鼻音 /n/ 收尾。', gloss: '潛鳥' },
    'en-noon-loon': { cue: '首尾都帶鼻腔共鳴，長元音保持平穩。', gloss: '中午' },
    'en-lip-nip': { cue: '用窄舌尖向前接觸，讓氣流從兩側釋放。', gloss: '嘴唇' },
    'en-nip-lip': { cue: '舌面接觸變寬、封住口腔，從鼻腔開始發聲。', gloss: '輕咬' },
    'zh-lan-nan': { cue: '舌尖輕觸上齒齦，氣流從舌頭兩側出來；不要先哼鼻音。聲調是第二聲。', gloss: '顏色：藍色' },
    'zh-nan-lan': { cue: '舌尖位置相近，但氣流要從鼻腔出來。輕按鼻翼，應感到震動。聲調是第二聲。', gloss: '方向：南方' },
    'zh-lao-nao': { cue: '先做清楚的邊音 /l/，再完成第三聲；不要讓開頭變成鼻音。', gloss: '年紀大' },
    'zh-nao-lao': { cue: '在元音前保留很短的鼻腔共鳴，同時保持第三聲輪廓。', gloss: '大腦' },
    'yue-nei-lei': { cue: '舌尖貼近上齒齦，先感受鼻翼震動，再放開到元音。香港口語常有 n/l 合流，本練習保留對立作清晰度訓練。', gloss: '第二人稱「你」' },
    'yue-lei-nei': { cue: '舌尖接觸上齒齦，中央受阻但兩側放氣；避免鼻腔先震動。', gloss: '道理；管理' },
  },
  yue: {
    'en-light-night': { cue: '舌尖收窄放前啲，貼近上門牙後面，等氣流由舌頭兩邊出。', gloss: '光；輕' },
    'en-night-light': { cue: '舌尖放闊貼住上齒齦，封住個口，等濁音氣流經鼻腔共鳴。', gloss: '夜晚' },
    'en-low-no': { cue: '舌尖保持窄同靠前；元音未開始之前先感受氣流由舌側出。', gloss: '低' },
    'en-no-low': { cue: '開頭先哼一下。手指放喺鼻側應該感到震。', gloss: '唔係；冇' },
    'en-need-lead': { cue: '先有鼻腔共鳴，再直接放開去長元音。', gloss: '需要' },
    'en-lead-need': { cue: '用舌尖擋住中間，等氣流由兩邊出，唔好帶鼻音。', gloss: '帶領' },
    'en-lever-never': { cue: '用窄而靠前嘅舌尖發清晰嘅 L；開頭唔好帶鼻音。', gloss: '槓桿' },
    'en-never-lever': { cue: '用闊啲嘅舌面封住個口，由鼻腔震動開始。', gloss: '從來唔' },
    'en-lock-knock': { cue: '先等濁音氣流由舌頭兩邊放出，再開去元音。', gloss: '鎖' },
    'en-knock-lock': { cue: '用短促嘅鼻音開頭；串法入面個 k 唔發音。', gloss: '敲門' },
    'en-lame-name': { cue: '個鼻保持靜，等氣流由較窄嘅舌尖兩邊滑出。', gloss: '跛' },
    'en-name-lame': { cue: '元音之前先感受鼻腔震動，結尾個 /m/ 都要清楚。', gloss: '名' },
    'en-lace-nice': { cue: '乾淨咁由舌側放氣，再順暢入 /eɪ/。', gloss: '蕾絲；鞋帶' },
    'en-nice-lace': { cue: '先用闊啲嘅口腔封閉，配合短促嘅濁鼻音開頭。', gloss: '好' },
    'en-lumber-number': { cue: '將唔帶鼻音嘅清晰 L 同後面個 /m/ 分開；淨係中間先應該有鼻音。', gloss: '木材' },
    'en-number-lumber': { cue: '一開始就要有鼻腔共鳴，到 /m/ 再嚟一次。', gloss: '數字' },
    'en-loon-noon': { cue: '用邊音開頭，再用獨立嘅鼻音 /n/ 收尾。', gloss: '潛鳥' },
    'en-noon-loon': { cue: '頭尾都有鼻腔共鳴，長元音保持平穩。', gloss: '中午' },
    'en-lip-nip': { cue: '用窄舌尖向前接觸，等氣流由兩邊放出。', gloss: '嘴唇' },
    'en-nip-lip': { cue: '舌面接觸放闊、封住個口，由鼻腔開始發聲。', gloss: '輕輕咬' },
    'zh-lan-nan': { cue: '舌尖輕掂上齒齦，氣流由舌頭兩邊出；唔好先哼鼻音。聲調係第二聲。', gloss: '顏色：藍色' },
    'zh-nan-lan': { cue: '舌尖位置差唔多，但氣流要由鼻腔出。輕按鼻翼，應該感到震。聲調係第二聲。', gloss: '方向：南' },
    'zh-lao-nao': { cue: '先做清楚嘅邊音 /l/，再完成第三聲；唔好俾開頭變成鼻音。', gloss: '年紀大' },
    'zh-nao-lao': { cue: '元音之前保留好短嘅鼻腔共鳴，同時保持第三聲輪廓。', gloss: '大腦' },
    'yue-nei-lei': { cue: '舌尖貼近上齒齦，先感受鼻翼震動，再放開去元音。香港口語成日 n/l 合流，呢個練習保留對立嚟練清晰度。', gloss: '第二人稱「你」' },
    'yue-lei-nei': { cue: '舌尖掂住上齒齦，中間阻住但兩邊放氣；避免鼻腔先震。', gloss: '道理；管理' },
  },
}

export function localizedExercise(
  exercise: Exercise,
  language: UILanguage,
): { cue: string; translation: string } {
  const copy = exerciseCopy[language]?.[exercise.id]
  return {
    cue: copy?.cue ?? exercise.cue,
    translation: copy?.gloss ?? exercise.translation,
  }
}
