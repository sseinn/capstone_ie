// src/components/main/PaymentConfirmation.tsx
import cardImage from "@/assets/Card.png";
import Header from "@/components/Header";
import Character from "@/components/Character";
import Captions from "@/components/Captions";

function PaymentConfirmation() {
  return (
    <div className="relative w-[1080px] h-[1920px]overflow-hidden">
      {/* HEADER */}
      <div className="absolute top-0 left-0 w-[1080px] h-36 overflow-hidden">
        <Header />
      </div>

      {/* CHARACTER */}
      <div className="absolute top-[149px] left-0 w-[1080px] h-[674px] flex justify-center">
        <Character />
      </div>

      {/* CAPTION (카드 이미지보다 위에 위치) */}
      <div className="absolute w-[1080px] h-[895px] left-0 top-[823px]">
        <div className="absolute left-[84px] top-[70px] w-[913px] h-56 text-center text-neutral-800 text-6xl font-semibold font-['Pretendard']">
          <Captions />
        </div>
      </div>

      {/* 카드 이미지 */}
      <div className="absolute w-72 h-72 left-[401px] top-[1054px]">
        <img
          src={cardImage}
          alt="결제 카드 이미지"
          className="w-72 h-72 object-contain animate-pulse"
        />
      </div>
    </div>
  );
}

export default PaymentConfirmation; 