"use strict";
/****************************


 <GLOBAL FUNCTIONS>

 ****************************/
const reloadApp = function () {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
};
/* Str[] to goal[] */
Object.getPrototypeOf(localStorage).asArrayOfObj = function () {
    let res = [];
    for (let i = 0; i < this.length-10; i++) {
        try {
            res.push(JSON.parse(this[i]))
        } catch (e) {
            console.error("Error index in localStorage:");
            console.error(e);
            reloadApp();
        }
    }
    return res
};
/* Remove like ListArray */
Object.getPrototypeOf(localStorage).safeRemove = function (index) {
    for (let i = index; i < this.length-10; i++)
        this[i] = this[i + 1]
    //
    delete this[this.length - 11]
};
function fixPercent(a,b,c) {
    if(a==="") a=0; // ParseInt(a)
    let sum = a+b+c;
    if(sum>100) a = 100 - (b + c);
    console.log("FixPercent("+a+","+b+","+c+") : "+a);
    return a
}
// СТАВКА
function rate(paymentsPerYear, paymentAmount, presentValue, futureValue, dueEndOrBeginning, interest) {
    interest = (interest === undefined) ? 0.01 : interest;
    futureValue = (futureValue === undefined) ? 0. : futureValue;
    dueEndOrBeginning = (dueEndOrBeginning === undefined) ? 0 : dueEndOrBeginning;

    const FINANCIAL_MAX_ITERATIONS = 128;//Bet accuracy with 128
    const FINANCIAL_PRECISION = 0.0000001;//1.0e-8

    let y, y0, y1, x0, x1, f = 0, i;
    let rate = interest;
    if (Math.abs(rate) < FINANCIAL_PRECISION)
    {
        y = presentValue * (1 + paymentsPerYear * rate) + paymentAmount * (1 + rate * dueEndOrBeginning) * paymentsPerYear + futureValue;
    }
    else
    {
        f = Math.exp(paymentsPerYear * Math.log(1 + rate));
        y = presentValue * f + paymentAmount * (1 / rate + dueEndOrBeginning) * (f - 1) + futureValue;
    }
    y0 = presentValue + paymentAmount * paymentsPerYear + futureValue;
    y1 = presentValue * f + paymentAmount * (1 / rate + dueEndOrBeginning) * (f - 1) + futureValue;

    // find root by Newton secant method
    i = x0 = 0.0;
    x1 = rate;
    while ((Math.abs(y0 - y1) > FINANCIAL_PRECISION)
    && (i < FINANCIAL_MAX_ITERATIONS))
    {
        rate = (y1 * x0 - y0 * x1) / (y1 - y0);
        x0 = x1;
        x1 = rate;

        if (Math.abs(rate) < FINANCIAL_PRECISION)
        {
            y = presentValue * (1 + paymentsPerYear * rate) + paymentAmount * (1 + rate * dueEndOrBeginning) * paymentsPerYear + futureValue;
        }
        else
        {
            f = Math.exp(paymentsPerYear * Math.log(1 + rate));
            y = presentValue * f + paymentAmount * (1 / rate + dueEndOrBeginning) * (f - 1) + futureValue;
        }

        y0 = y1;
        y1 = y;
        ++i;
    }
    return rate
}
/****************************


 GLOBAL VARIABLES

 ****************************/
// defaults structure for goal
const defaults = {
    cy: '₽',
    name: 'Цель',
    dateStart: new Date().yyyymmdd("-"),
    // (today + 1 year).parse("YYYY-mm-dd")
    dateFinish: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).yyyymmdd("-"),
    diffMonths: 12,
    rate : 0,
    dream: "", // totalMoney
};
// Primary start
const primaryStart = localStorage.length === 0;
if (primaryStart){
    localStorage[0] = JSON.stringify(defaults);
    localStorage.i = 0;
    localStorage.brokerBag = 30000;
    localStorage.pillowBag = 20000;
    localStorage.reserveBag = 10000;
    localStorage.inCom = 60000;
    localStorage.expense = 10000;
    localStorage.brokerPercent = 70;
    localStorage.pillowPercent = 20;
    localStorage.reservePercent = 10;
    localStorage.risk = 0;
}
// Fix deep event for app=>delTab()
let canDel = false;
// Global Application
const app = new Vue({
    el: "#app",
    data: {
        current: JSON.parse(localStorage[parseInt(localStorage.i)]),
        // Really shit is Magic Link
        goals: localStorage,
        // current index
        i:              parseInt(localStorage.i),
        brokerBag:      parseInt(localStorage.brokerBag),
        pillowBag:      parseInt(localStorage.pillowBag),
        reserveBag:     parseInt(localStorage.reserveBag),
        inCom:          parseInt(localStorage.inCom),
        expense:        parseInt(localStorage.expense),
        brokerPercent:  parseInt(localStorage.brokerPercent),
        pillowPercent:  parseInt(localStorage.pillowPercent),
        reservePercent: parseInt(localStorage.reservePercent),
        risk:           parseInt(localStorage.risk),
        // calculated attr`s
        broker: 0,
        pillow: 0,
        reserve: 0,
        gain: 0,
        saved: false
    },
    computed: {
        rate:function () {
            const inYear = 2;
            const years = +(this.current.diffMonths/12);
            /* Operands for rate */
            const kper = inYear*years;
            const plt = (-1)* this.broker*(12/inYear);
            const ps = (-1) * this.brokerBag;
            const bs = this.current.dream;

            let result = rate(kper,plt,ps,bs,0);

            if (isNaN(result) || this.gain<=0) result = 0;
            else result = result.toFixed(4)*100;
            console.log("current.rate("+kper+", "+plt+", "+ps+", "+bs+") = "+result);
            this.current.rate = result;
            return result
        },
        reserveMax:function () {
            return this.gain * 1.5
        },
        pillowMax:function () {
            return this.expense * 6
        },
        calcTable:function () {
            //console.clear();
            if(!this.saved){this.saved=!this.saved }
            let goals = this.goals.asArrayOfObj();
            let table = [];
            // Начало первой цели
            const beginnerDate = new Date(goals[0].dateStart);
            // Конец последней цели
            //const finisherDate = new Date(goals[goals.length-1].dateFinish);
            // Длина всего срока инвестировния
            //const totalMonths = Date.diff(beginnerDate,finisherDate)[1];

            const gainPillowPerc = 0.075/2;
            const gainReservePerc = 0.0625/2;



            let tBroker  = +this.brokerBag,
                tPillow  = +this.pillowBag,
                tReserve = +this.reserveBag;

            // goals.length*goals[i].diffMonths = totalMonths => O(n)
            for(let i=0;i<goals.length;i++){

                let yetChecked = false;
                //Бегунок по месяцам
                for(let j=0;j<goals[i].diffMonths;j++){
                    // beginnerDate++
                    beginnerDate.setMonth(beginnerDate.getMonth()+1);

                    tReserve += this.reserve;
                    tPillow += this.pillow;
                    tBroker += this.broker;
                    if((j+1) % 6 === 0){
                        console.log("Дивиденды["+beginnerDate.ddmmyyyy('.')+']');
                        console.log("\t Подушка => "+tPillow+" + "+(1+gainPillowPerc)+"%");
                        console.log("\t Резерв => "+tReserve+" + "+(1+gainReservePerc)+"%");
                        console.log("\t Брокер => "+tBroker+" + "+(1+goals[i].rate/100)+"%");
                        tBroker = Math.round(tBroker * (1+goals[i].rate/100));
                        tPillow = Math.round(tPillow * (1+gainPillowPerc));
                        tReserve = Math.round(tReserve * (1+gainReservePerc));
                        console.log("\t Подушка = "+tPillow);
                        console.log("\t Резерв = "+tReserve);
                        console.log("\t Брокер = "+tBroker);
                    }

                    // Structure return obj
                    const row = {
                        name: goals[i].name,
                        date : beginnerDate.ddmmyyyy("."),
                        totalMoney: tBroker+tPillow+tReserve,
                        broker:  tBroker,
                        pillow:  tPillow,
                        reserve: tReserve,
                        checked: false
                    };

                    if(!yetChecked && goals[i].dream<=row.totalMoney){
                        yetChecked = true;
                        row.checked = true;
                    }

                    table.push(row)
                }
            }
            return table
        }
    },
    watch: {
        // react saving in localStorage
        current: {
            handler: function () {
                this.goals[this.i] = JSON.stringify(this.current);
                this.saved = !this.saved;
            },
            deep: true
        },
        // Hard Fix for DataStart
        'current.dateStart': function () {
            const ds = new Date(this.current.dateStart);
            if(this.i>0){
                const prev = new Date(JSON.parse(this.goals[this.i-1]).dateFinish);
                if(ds < prev) this.current.dateStart = prev.yyyymmdd('-');
            } else {
                const today = new Date();
                let df = new Date(this.current.dateFinish);
                if(ds<today || ds>df) this.current.dateStart = today.yyyymmdd('-');
            }
        },
        // Hard Fix for DataFinish // todo clean
        'current.dateFinish': function () {
            let dsy = new Date(this.current.dateStart);
            dsy.setMonth(dsy.getMonth()+6);
            let df = new Date(this.current.dateFinish);
            if(df<dsy) this.current.dateFinish = dsy.yyyymmdd('-');
        },
        // Fix Percent
        brokerPercent: function(){
            this.brokerPercent = fixPercent(this.brokerPercent,this.reservePercent,this.pillowPercent);
            localStorage.brokerPercent = this.brokerPercent
        },
        pillowPercent: function(){
            this.pillowPercent = fixPercent(this.pillowPercent,this.reservePercent,this.brokerPercent);
            localStorage.pillowPercent = this.pillowPercent
        },
        reservePercent: function() {
            this.reservePercent = fixPercent(this.reservePercent,this.pillowPercent,this.brokerPercent);
            localStorage.reservePercent = this.reservePercent
        },
        // Один 2 3 4 8 Костыли писать не бросим!
        inCom: function () {
            localStorage.inCom = this.inCom;
        },
        expense: function () {
            localStorage.expense = this.expense;
        },
        risk: function () {
            if(this.risk>30) this.risk = 30;
            localStorage.risk = this.risk;
        },
        brokerBag: function () {
            localStorage.brokerBag = this.brokerBag;
        },
        pillowBag: function () {
            localStorage.pillowBag = this.pillowBag;
        },
        reserveBag: function () {
            localStorage.reserveBag = this.reserveBag;
        },
        i: function () {
            localStorage.i = this.i;
        },

    },
    methods: {
        newTab: function () {
            this.current = JSON.parse(JSON.stringify(defaults));
            this.goals[this.goals.length-10] = JSON.stringify(this.current);
            this.i = this.goals.length-11;
            // Fix for direct datetime
            this.current.dateStart = JSON.parse(this.goals[this.i-1]).dateFinish;
        },
        delTab: function () {
            // Fix deep events
            canDel = true
        },
        setActive: function (key) {
            // has click delTab early
            if (canDel) {
                canDel = false;
                // delTab:
                this.goals.safeRemove(key);
                // offset
                key = 0
            }
            // SetActive :
            this.current = JSON.parse(this.goals[key]);
            this.i = key
        }
    },
    mounted: function () {
        // Я не помню, почему это примонтированно?
        this.goals = localStorage
    }
});
// Change place by prior
$("#prior").change(function () {
    // app.goals === localStorage
    let t = app.goals[this.value];
    app.goals[this.value] = app.goals[app.i];
    app.goals[app.i] = t;
    app.i = this.value
});