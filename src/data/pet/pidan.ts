export interface PidanPhotoCard {
	id: string;
	title: string;
	badge: string;
	/** Relative path under BASE_URL (without leading slash) */
	image: string;
	caption: string;
	quote: string;
}

export const PIDAN_PROFILE = {
	name: '皮蛋',
	subtitle: '海豹重点色长毛陪读猫',
} as const;

export const PIDAN_PHOTO_CARDS: PidanPhotoCard[] = [
	{
		id: 'fluffy-onigiri',
		title: '炸毛饭团',
		badge: '飞机腮帮',
		image: 'image/pet/cards/pidan-01-fluffy-onigiri.webp',
		caption: '横向生长的蓬松脸颊毛，端坐时像一颗刚捏好的芝麻馅三角饭团。',
		quote: '本喵这不是胖，是腮帮子毛量富裕！',
	},
	{
		id: 'sapphire-closeup',
		title: '冰蓝宝石',
		badge: '怼脸暴击',
		image: 'image/pet/cards/pidan-02-sapphire-closeup.webp',
		caption: '阳光洒在小黑脸上，通透的冰蓝色瞳仁配雪白长胡须格外清晰。',
		quote: '盯——今天也有认真看文章吗？',
	},
	{
		id: 'donut-collar',
		title: '小鱼甜甜圈',
		badge: '限定皮肤',
		image: 'image/pet/cards/pidan-03-donut-collar.webp',
		caption: '套上印满小鱼的软垫圈，圆溜溜的大眼睛依然萌力全开。',
		quote: '圈上的小鱼怎么吃不到喵……',
	},
	{
		id: 'cheek-poke',
		title: '戳脸营业',
		badge: '乖巧黑爪',
		image: 'image/pet/cards/pidan-04-cheek-poke.webp',
		caption: '伸出两只挖煤小黑手套乖巧趴好，任由手指戳进蓬松腮帮。',
		quote: '戳一下收一条小鱼干，童叟无欺～',
	},
	{
		id: 'playful-hunt',
		title: '歪头捕猎',
		badge: '锁定目标',
		image: 'image/pet/cards/pidan-05-playful-hunt.webp',
		caption: '抬起一只小黑爪歪头紧盯逗猫草，下一秒就要原地起飞。',
		quote: '发现可疑光标！准备扑击！',
	},
	{
		id: 'boba-stare',
		title: '珍珠大眼',
		badge: '瞳孔放大',
		image: 'image/pet/cards/pidan-06-boba-stare.webp',
		caption: '圆滚滚的大黑瞳几乎占满眼眶，好奇心拉满的低角度凝视。',
		quote: '你口袋里是不是藏好吃的了？',
	},
	{
		id: 'belly-flop',
		title: '翻肚碰瓷',
		badge: '地板毛毯',
		image: 'image/pet/cards/pidan-07-belly-flop.webp',
		caption: '在木地板上直接瘫成一张长毛地毯，无辜眼神发出摸肚皮邀请。',
		quote: '路过不摸一下皮蛋，是走不掉的哦。',
	},
	{
		id: 'majestic-mane',
		title: '围脖大佬',
		badge: '仰角气场',
		image: 'image/pet/cards/pidan-08-majestic-mane.webp',
		caption: '瀑布般的纯白胸毛大围脖，仰角看过去气场两米八。',
		quote: '叫声皮蛋大王，本喵罩着你读完这篇！',
	},
	{
		id: 'squint-judge',
		title: '眯眼审视',
		badge: '看透一切',
		image: 'image/pet/cards/pidan-09-squint-judge.webp',
		caption: '端坐床头微微眯起蓝眼睛，仿佛已经看穿了人类的全部心思。',
		quote: '嗯……这行代码的味道我闻出来了。',
	},
	{
		id: 'marshmallow-top',
		title: '烤棉花糖',
		badge: '俯视毛团',
		image: 'image/pet/cards/pidan-10-marshmallow-top.webp',
		caption: '俯视视角下圆润饱满的一整团奶咖长毛，仰起小黑脸偷看镜头。',
		quote: '俯看更圆润？那叫黄金比例喵！',
	},
	{
		id: 'sniff-cam',
		title: '贴脸嗅探',
		badge: '好奇宝宝',
		image: 'image/pet/cards/pidan-11-sniff-cam.webp',
		caption: '小黑鼻子快贴到镜头上了，先闻闻今天是谁来逛博客。',
		quote: '嗅嗅……是喜欢猫猫的好人！',
	},
	{
		id: 'toasted-loaf',
		title: '焦糖吐司',
		badge: '农民揣背影',
		image: 'image/pet/cards/pidan-12-toasted-loaf.webp',
		caption: '标准焦糖奶咖色猫猫虫背影，耳朵微侧其实一直在偷偷听动静。',
		quote: '本喵只是背过去思考喵生，没在生气。',
	},
];

export const PIDAN_DIALOGUES = {
	greet: [
		'喵～我是皮蛋，陪你一起逛博客！',
		'皮蛋已就位，点我可以撸毛或切换真猫萌照哦～',
		'呼噜噜……今天想先看哪一篇？',
	],
	pet: [
		'呼噜呼噜～下巴再挠两下！',
		'喵呜！围脖毛都被你揉蓬松啦 ♥',
		'手感认证：100% 纯天然长毛棉花糖！',
		'耳朵动了动～皮蛋心情值 +10！',
		'别光顾着摸挖煤脸，小黑爪也很可爱喵～',
	],
	petCombo: [
		'连环撸猫！！皮蛋要融化成猫饼啦 🫠♥',
		'呼噜声已开到最大档——咕噜咕噜咕噜！',
		'再摸下去就要翻肚皮碰瓷咯！',
	],
	feed: [
		'嗷呜！是香喷喷的小鱼干！🐟',
		'咔嚓咔嚓……皮蛋宣布你是今日最佳铲屎官！',
		'吃完这口小鱼干，再陪你读十篇！✨',
	],
	sleep: [
		'呼噜……梦里全是小鱼干……Zzz',
		'揣手手打个盹，你慢慢看～',
		'团成一颗烤棉花糖充电中……',
	],
	wake: [
		'喵呜？皮蛋没睡，皮蛋只是闭眼思考！',
		'伸个大懒腰～满血复活！',
	],
	drag: [
		'喵嗷？！被命运扼住了后颈皮！',
		'腾空啦！轻点放我下来喵～',
		'飞天皮蛋巡逻中——',
	],
	drop: [
		'啪嗒！四只小黑爪稳稳落地！',
		'抖抖大围脖，发型不能乱～',
	],
	fastScroll: [
		'哇啊啊滚太快啦，皮蛋的飞机耳要起飞了！',
		'小短腿倒腾冒烟啦，慢点滑喵～',
		'呼呼——差点没追上你的手速！',
	],
	milestone25: '已经读完 1/4 啦，皮蛋在旁边乖巧端坐陪读～',
	milestone50: '进度过半！奖励自己摸摸皮蛋休息两秒吧 ✨',
	milestone85: '快读完咯，皮蛋竖起小黑耳朵听重点！',
	milestone100: '🎉 整篇读完啦！皮蛋给你摇大尾巴撒花！',
	toReal: '变身！给你看真实世界的皮蛋本尊 📸',
	toChibi: '切回 Q 版皮蛋，继续在页面底下散步陪你啦 🐾',
} as const;
