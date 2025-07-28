console.log("olá mundo!")
// mostra no console do F12 o texto que está em parenteses.
function apresentacao()
//declara uma função.
{
    let n1 = 0;
    let n2 = 0;
    let resultado = 0;
    let MostraresultadoHTML = document.getElementById('resultado');
    // são 4 variáveis, a n1 irá receber o 1° número, a n2 irá receber o 2° número, a resultado irá receber a soma da n1 e n2 e a MostraresultadoHTML irá mostrar na tela.

    n1 = Number(prompt("Digite um número para fazermos a soma:"));
    n2 = Number(prompt("Agora, digite o outro número:")) ;
    // declara os números para cada variável.
    resultado = n1 + n2;
    // declara o valor da variável "resultado".
    MostraresultadoHTML.innerHTML = ("O resultado é " + resultado + ".") ;
    // mostra no corpo do site.
}