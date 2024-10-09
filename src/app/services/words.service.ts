import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WordsService {
  constructor(private http: HttpClient) {}

  getJsonData(): Observable<any> {
    return this.http.get('/assets/words/words.json');
  }

  questions(words: any): any[] {
    let questions: any[] = [];
    for (const mainKey in words) {
      if (words.hasOwnProperty(mainKey)) {
        const nestedKeys = Object.keys(words[mainKey]);

        const randomNestedKey = this.getRandomKey(nestedKeys, words, mainKey);

        questions.push({
          mainKey: mainKey,
          nestedKey: randomNestedKey,
          value: this.fixValue(words[mainKey][randomNestedKey]),
          situation: 'e',
          color: "#2c5d63"
        });
      }
    }
    return questions;
  }

  private getRandomKey(keys: string[], words: any, mainKey: any): string {
    const randomIndex = Math.floor(Math.random() * keys.length);
    if (this.validateValue(words[mainKey][keys[randomIndex]])) {
      return keys[randomIndex];
    } else {
      return this.getRandomKey(keys, words, mainKey);
    }
    //return keys[randomIndex];
  }

  private validateValue(value: String): boolean {
    if (value === 'yok' || value === 'yok' || value.includes('>')) {
      return false;
    } else {
      return true;
    }
  }

  private fixValue(value: any): string {
    const lastElement = value.charAt(value.length - 1);
    if (lastElement === '.' || lastElement === ':') {
      return value.slice(0, -1);
    } else {
      return value;
    }
  }

  checkAnswer(input: any, answer: any) : boolean{
    input = this.lowerCase(input);
    answer = this.lowerCase(answer);
    
    return input === answer;
  }

  private removeMastar(text : any){
    const lastThreeCharacter = text.slice(-3);
    const lastTwoCharacter = text.slice(-2);

    if(lastTwoCharacter === "ma" || lastTwoCharacter === "me"){
      return text.slice(0, -2);
    } else if(lastThreeCharacter === "mak" || lastThreeCharacter === "mek"){
      return text.slice(0, -3);
    } else {
      return text;
    }
  } 

  public lowerCase(text: any): string {
    var string = text.toString();
    var letters : any = { İ: "i", I: "i", ı: "i", Ş: "s", ş: "s", Ğ: "g", ğ: "g", Ü: "u", ü: "u", Ö: "o", ö: "o", Ç: "c", ç: "c"};

    string = string.replace(/(([İIıŞşĞğÜüÇçÖö]))/g, function (letter: string | number) {
      return letters[letter];
    });

    return this.removeMastar(string.toLowerCase());
  }

  private upperCase(text: any): any {
    var string = text.toString();
    var letters : any = { "i": "I", "ş": "S", "ğ": "G", "ü": "U", "ö": "O", "ç": "C", "ı": "I" };

    string = string.replace(/(([iışğüçö]))/g, function (letter: any) {
      return letters[letter];
    });

    return string.toUpperCase();
  }

}
