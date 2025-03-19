let textShow = true;

function showText(){
        // Select all elements with the class 'text-info-hidden-1'
        const elements = document.getElementsByClassName('text-info-hidden-1');
        
        // Loop through each element and toggle display
        /* for (let i = 0; i < elements.length; i++) {
          if (textShow) {
            elements[i].style.display = 'none'; // Hide the elements
          } else {
            elements[i].style.display = 'inline'; // Show the elements
          }
        }*/

        // Loop through each element and toggle visibility and blur
        for (let i = 0; i < elements.length; i++) {
        if (textShow) {
            elements[i].classList.remove('visible'); // Hide the text
        } else {
            elements[i].classList.add('visible'); // Show the text
        }
        }
        
        // Toggle the textShow flag for the next click
        textShow = !textShow;
}   