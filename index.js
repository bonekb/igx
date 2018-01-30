const Client = require('instagram-private-api').V1;
const delay = require('delay');
const chalk = require('chalk');
const _ = require('lodash');
const rp = require('request-promise');
const inquirer = require('inquirer');

const User = [
	{
		type:'input',
		name:'username',
		message:'Masukan Username ig anda',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'password',
		name:'password',
		message:'Masukan Password Anda',
		mask:'*',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'input',
		name:'target',
		message:'Insert Username Target (Without @[at])',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'input',
		name:'text',
		message:'Masukan Bot Coment, Gunakan [|] Untuk Pembatas Komen Lebih Dari Satu Kalimat ',
		validate: function(value){
			if(!value) return 'Can\'t Empty';
			return true;
		}
	},
	{
		type:'input',
		name:'sleep',
		message:'Jeda Waktu (Perdetik)',
		validate: function(value){
			value = value.match(/[0-15]/);
			if (value) return true;
			return 'Delay is number';
		}
	}
]

const Login = async function(User){

    const Device = new Client.Device(User.username);
    const Storage = new Client.CookieMemoryStorage();
    const session = new Client.Session(Device, Storage);

    try {
        await Client.Session.create(Device, Storage, User.username, User.password)
        const account = await session.getAccount();
        return Promise.resolve({session,account});
    } catch (err) {
        return Promise.reject(err);
    }

}

const Target = async function(username){
	const url = 'https://www.instagram.com/'+username+'/?__a=1'
	const option = {
		url: url,
		method: 'GET',
		json:true
	}
	try{
		const account = await rp(option);
		if (account.user.is_private) {
			return Promise.reject('Target is private Account');
		} else {
			const id = account.user.id;
			const followers = account.user.followed_by.count;
			return Promise.resolve({id,followers});			
		}
	} catch (err){
		return Promise.reject(err);
	}

}

async function ngefollow(session,accountId){
	try {
		await Client.Relationship.create(session, accountId);
		return true
	} catch (e) {
		return false
	}
}

async function ngeComment(session, id, text){
	try {
		await Client.Comment.create(session, id, text);
		return true;
	} catch(e){
		return false;
	}
}

async function ngeLike(session, id){
	try{
		await Client.Like.create(session, id)
		return true;
	} catch(e) {
		return false;
	}
}

const CommentAndLike = async function(session, accountId, text){
	var result;

	const feed = new Client.Feed.UserMedia(session, accountId);

	try {
		result = await feed.get();
	} catch (err) {
		return chalk`{bold.red ${err}}`;
	}

	if (result.length > 0) {
		const task = [
			ngefollow(session, accountId),
			ngeComment(session, result[0].params.id, text),
			ngeLike(session, result[0].params.id)
		]
		const [Follow,Comment,Like] = await Promise.all(task);
		const printFollow = Follow ? chalk`{green Follow}` : chalk`{red Follow}`;
		const printComment = Comment ? chalk`{bold.yellow Comment}` : chalk`{red Comment}`;
		const printLike = Like ? chalk`{green Like}` : chalk`{red Like}`;
		return chalk`{bold.cyan ${printFollow},${printComment},${printLike} [${text}]}`;
	}
	return chalk`{bold.red Media Profile Kosong [dilewati]}`
};

const Followers = async function(session, id){
	const feed = new Client.Feed.AccountFollowers(session, id);
	try{
		const Pollowers = [];
		var cursor;
		do {
			if (cursor) feed.setCursor(cursor);
			const getPollowers = await feed.get();
			await Promise.all(getPollowers.map(async(akun) => {
				Pollowers.push(akun.id);
			}))
			cursor = await feed.getCursor();
		} while(feed.isMoreAvailable());
		return Promise.resolve(Pollowers);
	} catch(err){
		return Promise.reject(err);
	}
}

const Excute = async function(User, TargetUsername, Text, Sleep){
	try {
		console.log(chalk`{cyan \n | Login Ke Akun Anda .....}`)
		const doLogin = await Login(User);
		console.log(chalk`{bold  | SUKSES..|  try To Get Informarion ....}`)
		const getTarget = await Target(TargetUsername);
		console.log(chalk`{cyan  | ${TargetUsername}[${getTarget.id}] Followers: ${getTarget.followers}}`)
		const getFollowers = await Followers(doLogin.session, doLogin.account.id)
		console.log(chalk`{bold  | Memulai BOT  \n}`)
		const Targetfeed = new Client.Feed.AccountFollowers(doLogin.session, getTarget.id);
		var TargetCursor;
		do {
			if (TargetCursor) Targetfeed.setCursor(TargetCursor);
			var TargetResult = await Targetfeed.get();
			TargetResult = _.chunk(TargetResult, 15);
			for (let i = 0; i < TargetResult.length; i++) {
				await Promise.all(TargetResult[i].map(async(akun) => {
					if (!getFollowers.includes(akun.id) && akun.params.isPrivate === false) {
						var ranText = Text[Math.floor(Math.random() * Text.length)];
						const ngeDo = await CommentAndLike(doLogin.session, akun.id, ranText)
						console.log(chalk`{bold.green  [√] }${akun.params.username} [Hasil] ${ngeDo}`)
					} else {
						console.log(chalk`{bold.red [SKIPPED]}${akun.params.username} [Hasil] AKUN TERKUNCI / SUDAH DI FOLLOW`)
					}
				}));
				console.log(chalk`{bold Memulai bot lagi setelah ${Sleep} Detik  }`);
				await delay(Sleep);
			}
			TargetCursor = await Targetfeed.getCursor();
			console.log(chalk`{yellow Delay For ${Sleep} MiliSeconds}`);
			await delay(Sleep);
		} while(Targetfeed.isMoreAvailable());
	} catch (err) {
		console.log(err);
	}
}

console.log(chalk`
{bold HARGA BOT HANYA SEPULUH RIBU}
{bold.green 🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊  }
{bold 🐊 VIP BOT INSTAGTAM     🐊}
{bold.green 🐊 ♥  BONEK SWAG ♥     🐊}
{bold 🐊 SALAM SATU NYALI WANI!     🐊}
{bold.green 🐊 |Follow IG @Basisijo|     🐊}
{bold 🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊   🐊  🐊  🐊  🐊  🐊}
{bold.green 🐊 FUNSI BOT INI AUTO FOLLOW FOLLOWER TARGET🐊}
{bold 🐊 Auto Bot Komen, Like,                    🐊}
{bold.green 🐊 Premiun USER BOT INSTAGRAM by BASISIJO   🐊}
{bold 🐊 SALAM SATU NYALI                         🐊}
{bold.green 🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊  🐊   🐊  🐊  🐊  🐊  🐊}

`);

inquirer.prompt(User)
	.then(answers => {
		var text = answers.text.split('|');
		Excute({
			username:answers.username,
			password:answers.password
		},answers.target,text,answers.sleep);
	})
