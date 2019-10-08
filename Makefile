.PHONY: all clean

auntietuna-unsigned.xpi: src/*
	7z a -tzip -xr\!_* -xr\!.* $@ ./src/* ./LICENSE

all: %.xpi

clean:
	$(RM) auntietuna-unsigned.xpi

# vim: set noexpandtab ts=2 sw=2 tw=72:
