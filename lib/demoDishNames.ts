import type { UiLang } from "./i18n";

const DEMO_DISH_NAMES: Array<[string, string]> = [
  ["小米粥", "Millet porridge"],
  ["水煮鸡蛋", "Boiled egg"],
  ["糙米饭", "Brown rice"],
  ["清蒸鲈鱼", "Steamed sea bass"],
  ["西兰花", "Broccoli"],
  ["荞麦面", "Buckwheat noodles"],
  ["番茄炒鸡蛋", "Tomato and egg"],
  ["清炒菠菜", "Stir-fried spinach"],
  ["无糖豆浆", "Unsweetened soy milk"],
  ["全麦馒头", "Whole-wheat bun"],
  ["凉拌黄瓜", "Cucumber salad"],
  ["杂粮饭", "Multigrain rice"],
  ["香煎鸡胸肉", "Pan-seared chicken breast"],
  ["蒜蓉西兰花", "Garlic broccoli"],
  ["日式荞麦面", "Japanese soba"],
  ["烤三文鱼", "Baked salmon"],
  ["生菜沙拉", "Green salad"],
  ["鸡蛋灌饼", "Egg pancake"],
  ["牛肉河粉", "Beef rice noodles"],
  ["清炒上海青", "Stir-fried bok choy"],
  ["海带汤", "Seaweed soup"],
  ["清蒸虾", "Steamed shrimp"],
  ["凉拌木耳", "Wood ear salad"],
  ["茶叶蛋", "Tea egg"],
  ["白米饭", "White rice"],
  ["红烧肉", "Braised pork"],
  ["清炒空心菜", "Stir-fried water spinach"],
  ["韩式炸鸡", "Korean fried chicken"],
  ["辣炒年糕", "Spicy rice cakes"],
  ["甜辣酱", "Sweet chili sauce"],
];

const ZH_TO_EN = new Map(DEMO_DISH_NAMES);
const EN_TO_ZH = new Map(DEMO_DISH_NAMES.map(([zh, en]) => [en, zh]));

export function demoDishName(name: string, lang: UiLang): string {
  if (lang === "en") return ZH_TO_EN.get(name) ?? name;
  return EN_TO_ZH.get(name) ?? name;
}
