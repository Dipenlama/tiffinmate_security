let message: string ="message";
console.log(message)
//message = 10 ; //error

//primitive types: string, number, boolean, null, undefined, symbol, bigint
let num: number=42;
let isActive: boolean = true;
let nullableValue: null=null;
let undefinedValue: undefined=undefined;
let bigIntValue: bigint=90032324234n;
let symbolValue:symbol=Symbol("unique");

let anyValue: any ="could be anything too";
anyValue=100; // no error

let unknownValue: unknown="could be anything too";
//unknownValue = unknownValule + 10; //error

//arrays
let numArt:number[]=[1,2,3];
//tuples
let tuppleArt: [string, number]= ["Age",30]

let id: string |number;
id= "Yaman";
console.log(id)
id=30;
//id= true; //error

//functions
function add(num1: number, num2: number): number{
    let sum: number =  num1 + num2;
    return sum;
}
let result: number = add (5, 10);
console.log(result)

const info= (name:string | number): void =>{
    console.log(name)
}
info ("Hari")
info(24)

//objects
let userDetail: {name: String, age: number}={
    name: "Nipuna",
    age:24,
    //isActive: true //error
};
console.log(userDetail)

//type interface
interface User{
    name: String;
    age: number;
    isActive?: boolean; //optional property
}
let user1: User={
    name: "Yaman",
    age: 20
}
console.log(user1)

//type alias
type Point={
    x: number;
    y:number;
    desc?: String;
}
let point1: Point={
    x:10,
    y:20,
    desc:"2D Space"
}
console.log(point1)

//Generics <T>
//specify type in placeholder 
function identity <T> (arg: T): T{
    return arg;
}
let output1=identity<String>("Hello");
let output2 =identity<number> (100);
console.log(output1, output2)

//ENUMS
enum Role{
    Admin,
    User,
    Guest
}
let userRole: Role= Role.Admin;
console.log(userRole)// index-0
console.log(Role[userRole])// value - Admin

interface UserDetail{
    id: number;
    name: String;
    role: Role;
}
let user2: Partial<UserDetail>={
    role:Role.User
};
console.log(user2)

let user3: Readonly<UserDetail>={
    id:1,
    name:"yaman",
    role:Role.Admin
};
//user3.name="new name"; //error
console.log(user3)
