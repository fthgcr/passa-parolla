import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WordsService } from './words.service';

@Injectable({
  providedIn: 'root'
})
export class PyramidService {

  constructor(private http: HttpClient, wordService: WordsService) {}

  outputArray: any[] = [];
  jsonArray : any[] = [];

  getJsonData(): Observable<any> {
    return this.http.get('/assets/words/words.json');
  }

  organizeWords(words: any[]) {
    let questions: any[] = [];
    for (const mainKey in words) {
      if (words.hasOwnProperty(mainKey)) {
        const nestedKeys = Object.keys(words[mainKey]);
        for (const nestedKey of nestedKeys) {
          questions.push({
            mainKey: mainKey,
            nestedKey: nestedKey,
            value: words[mainKey][nestedKey],
          });
        }
      }
    }

    this.orderWords(questions);
  }

  orderWords(questions: any[]) {
    let wordArray = [];
    for (const question of questions) {
      wordArray.push({
        [question.nestedKey.length]: {
          nestedKey: question.nestedKey,
          value: question.value,
        },
      });
    }

    const result: any = {};
    wordArray.forEach((item) => {
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          // If the key does not exist in the result, initialize it as an empty object
          if (!result[key]) {
            result[key] = {};
          }
          // Add the nestedKey as the property and value as its value
          const { nestedKey, value } = item[key];
          result[key][nestedKey] = value;
        }
      }
    });

    for (const key in result) {
      if (result.hasOwnProperty(key)) {
        // Get the nested object values and keys
        const entries = Object.entries(result[key]);
        
        // Shuffle only the values
        const shuffledValues = this.shuffleArray(entries.map(([k, v]) => v));
        
        // Create a new object with shuffled values but the same keys
        result[key] = entries.reduce((acc, [k], index) => {
          acc[k] = shuffledValues[index];
          return acc;
        }, {} as any);
      } 
    }

    //const keys = Object.keys(result[3]);
    //console.log(keys[0]);

    for (let index = 3; index < 8; index++) {
      result[index] = this.shuffleObjectKeys(result[index]);
    }

    for (let index = 8; index < 18; index++) {
      delete result[index];
    }

    //console.log(result[3])
    this.createWords(this.clearArray(result));
    
  }

  createWords(words: any){
    this.jsonArray = words;
    //console.log(JSON.stringify(this.processJsonArray(words)));
    //this.processJsonArray(words);
    console.log(JSON.stringify(this.outputArray));
    this.findMatchingKeys(7,4);
    /*let result: any[] = [];
    console.log(words[7]);

    for(let index = 7; index > 3; index--){
      //console.log(Object.entries(words[index]));
      for(const k of Object.keys(words[index])){

        //console.log(k[1]);
      }
    }*/
  }

  findMatchingKeys(startIndex: number, endIndex: number) {
    let jsonArray = this.jsonArray;
    let outputArray: any[] = [];
    for (let i = startIndex; i >= endIndex; i--) {
      const currentKeys = Object.keys(jsonArray[i]);
  
      for (const key of currentKeys) {
        const originalValue = jsonArray[i][key];
  
        // Loop through each character in the key
        for (let j = 0; j < key.length; j++) {
          const deletedChar = key[j];
          const modifiedKey = key.slice(0, j) + key.slice(j + 1); // Remove the character
  
          // Check for matching key in the next index
          if (i > endIndex) {
            const nextKeys = Object.keys(jsonArray[i - 1]);
            if (nextKeys.includes(modifiedKey)) {
              // Match found in the next index
              outputArray.push({
                key: key,
                value: originalValue,
                deletedChar: deletedChar
              });
              break; // Exit to the next key
            }
          }
        }
      }
  
      // If no match found for the current index, add the first key with null
      if (outputArray.length < (startIndex - endIndex + 1) - (startIndex - i + 1)) {
        outputArray.push({
          key: currentKeys[0],
          value: "",
          deletedChar: null
        });
      }
    }
  }

  clearArray(words: any[]){
    for(let index = 7; index > 3; index--){
      //console.log(Object.entries(words[index]));
      for (const key in words[index]) {
        // Check if the value of the key is 'yok'
        if (words[index][key] === 'yok') {
          delete words[index][key];  // Delete the key
        }
      }
    }

    return words;
  }



  shuffleObjectKeys(obj: { [key: string]: any }): { [key: string]: any } {
    const keys = Object.keys(obj);
    const shuffledKeys = this.shuffleArray(keys);
    
    const newObj: { [key: string]: any } = {};
    shuffledKeys.forEach(key => {
      newObj[key] = obj[key];
    });
    
    return newObj;
  }

  shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

}
