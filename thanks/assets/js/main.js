$(document).ready(function(){
  $("a").on('click', function(event) {
    if (this.hash !== "") {
      event.preventDefault();
      var hash = this.hash;
      $('html, body').animate({
        scrollTop: $(hash).offset().top
      }, 800, function(){
        window.location.hash = hash;
      });
    }
  });
  $(".product-order__btn").on('click', function(event) {
    $(this).parents(".product__content").addClass("is-ordered");
    $(".product__content").not(".is-ordered").slideUp();
    $(".suggestion-product").slideUp();
    $(".product__content.is-ordered").find(".order-suggestion-info__content").slideDown();
  });
}); 