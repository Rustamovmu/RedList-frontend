"use client";
import {FC, type ReactNode} from "react";

import Image from "next/image";
// Wildward addition (D-068): the kit's two fonts, self-hosted from npm (SIL Open Font License), because the CSP allows
// fonts from 'self' only (no Google Fonts request). Tiempos Headline is a paid font, so the titles use Source Serif 4
// as a free stand-in. globals.css maps the kit's class names (font-tiemposHeadline, font-manrope) to these families.
// The browser downloads a font file only on a page that shows the cards.
import "@fontsource-variable/source-serif-4/wght.css";
import "@fontsource-variable/manrope/wght.css";

// Types
interface iCardItem {
	title: string;
	description: string;
	tag: string;
	/** Wildward change (D-068): optional, so a card can show `media` instead, or no photo at all. */
	src?: string;
	link: string;
	color: string;
	textColor: string;
	/** Wildward addition (D-068): shown instead of the `src` image, e.g. a catalogue photo shown whole (WholePhoto, D-039). */
	media?: ReactNode;
	/** Wildward addition (D-068): a line at the card's foot, e.g. the name of the species in the photo. */
	caption?: ReactNode;
}

interface iCardProps extends Omit<iCardItem, "src" | "link" | "tag"> {
	i: number;
	src?: string;
}

// Constants
const TOP_VALUES: Record<number, string> = {
	1: "1/2",
	2: "1/2",
	3: "1/2",
	4: "1/2",
};

// Components
const Card: FC<iCardProps> = ({
	title,
	description,
	color,
	textColor,
	i,
	src,
	media,
	caption,
}) => {
	const photo = media ?? (src ? (
		<Image
			className="w-full h-full object-cover"
			src={src}
			// Wildward change (D-068): decorative, so an empty alt instead of "Background".
			alt=""
			fill
			sizes="(min-width: 1152px) 1100px, 100vw"
		/>
	) : null);
	return (
		// Wildward change (D-068): pinned below the site's sticky navigation (--nav-h) instead of at the top of the screen,
		// so the navigation never covers a card. Each section is one screen tall minus the navigation. A card with keyboard
		// focus inside comes to the front: tabbing backwards does not scroll, so its link would otherwise be focused under
		// the next card (WCAG 2.4.11).
		<div className="h-[calc(100svh-var(--nav-h,0px))] flex items-center justify-center sticky top-[var(--nav-h,0px)] has-[:focus-visible]:z-10 md:p-0 px-4">
			{/* Wildward change (D-068, owner: "make it bigger"): instead of 700 × 300 / 600 × 400 px, the card is as large as
			    the screen allows. On phones it is up to 26 rem tall. From md up it is 3:2, the shape of most catalogue
			    photos, and as wide as the screen's width (less 2 rem a side) and remaining height allow, at most 68.75 rem. */}
			<div
				className="relative flex flex-col h-[min(26rem,calc(100svh-var(--nav-h,0px)-4rem))] w-[700px] max-w-full py-12 px-10 md:px-12
				rotate-0 md:h-auto md:aspect-[3/2] md:w-[min(calc(100vw-4rem),68.75rem,calc((100svh-var(--nav-h,0px)-5rem)*1.5))] items-center justify-center mx-auto
				shadow-md pr-3 pl-3 pt-3 pb-4"
				style={{backgroundColor: color}}
			>
				{/* Wildward change (D-068): a heading (h3) instead of a span, so the titles sit under the section's h2; centred
				    when a long name wraps; larger type for the larger card, one step smaller for a title over 18 characters
				    (a long species name), so it fits above the caption. */}
				<h3
					className={`font-bold relative text-center mt-5 ${title.length > 18
						? "text-[clamp(2.25rem,11vw,3rem)] md:text-7xl xl:text-8xl"
						: "text-[clamp(2.75rem,15vw,3.75rem)] md:text-8xl xl:text-9xl"}`}
				>
					<span
						className="relative z-10 font-tiemposHeadline font-black tracking-tight"
						style={{color: textColor}}
					>
						{title}
					</span>
				</h3>
				<div
					className="font-manrope text-xl md:text-3xl lg:text-4xl md:max-w-[30ch] font-medium text-center mb-0 z-50 mt-2 md:mt-4 lowercase tracking-wide"
					style={{lineHeight: 1.4, color: textColor}}
				>
					{description}
				</div>
				{/* Wildward change (D-068): clips its content, because WholePhoto's blurred fill is scaled past the frame. */}
				<div className="absolute inset-0 z-0 overflow-hidden">
					{photo}
					{/* Wildward addition (D-068): a 55 % black scrim between photo and text. White text over it keeps at least
					    4.7:1 contrast even where the photo is pure white (WCAG AA). */}
					{photo ? <div aria-hidden className="absolute inset-0 bg-black/55" /> : null}
				</div>
				{/* Wildward addition (D-068): the caption, at the card's foot. */}
				{caption ? (
					<div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-3 text-left text-xs md:px-6 md:pb-5 md:text-sm leading-relaxed">
						{caption}
					</div>
				) : null}
			</div>
		</div>
	);
};

/**
 * CardSlide component displays a series of cards in a vertical scroll layout
 * Each card contains a title, description, and decorative elements
 */
interface iCardSlideProps {
	items: iCardItem[];
}

const CardsParallax: FC<iCardSlideProps> = ({items}) => {
	return (
		<div className="min-h-screen">
			{items.map((project, i) => {
				return <Card key={`p_${i}`} {...project} i={i} />;
			})}
		</div>
	);
};

export {CardsParallax, type iCardItem};
